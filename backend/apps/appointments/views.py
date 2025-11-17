import razorpay
import hmac
import hashlib
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from .models import Appointment
from .serializers import (
    AppointmentSerializer,
    CreateAppointmentSerializer,
    RazorpayOrderSerializer,
    RazorpayPaymentVerificationSerializer,
    RescheduleAppointmentSerializer,
    CheckAvailabilitySerializer,
)
from apps.accounts.models import User, CounsellorProfile
from decimal import Decimal

# Initialize Razorpay client
# You'll need to add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to settings.py
try:
    razorpay_client = razorpay.Client(
        auth=(getattr(settings, 'RAZORPAY_KEY_ID', ''), getattr(settings, 'RAZORPAY_KEY_SECRET', ''))
    )
except:
    razorpay_client = None


class AppointmentListView(APIView):
    """List appointments for the authenticated user."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        appointments = Appointment.objects.filter(
            Q(client=user) | Q(counsellor=user)
        ).select_related('client', 'counsellor').order_by('-appointment_date')
        
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CreateAppointmentView(APIView):
    """Create a new appointment (before payment)."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            serializer = CreateAppointmentSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'detail': 'Invalid data.', 'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = request.user
            counsellor_id = serializer.validated_data['counsellor_id']
            appointment_date = serializer.validated_data['appointment_date']
            duration_minutes = serializer.validated_data.get('duration_minutes', 60)
            notes = serializer.validated_data.get('notes', '')
            
            # Check if user is a client
            if user.role != 'client':
                return Response(
                    {'detail': 'Only clients can book appointments.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get counsellor - counsellor_id can be either User.id or CounsellorProfile.id
            try:
                # First try to get by User ID
                counsellor = User.objects.get(id=counsellor_id, role='counsellor')
            except User.DoesNotExist:
                # If not found, try to get by CounsellorProfile ID
                try:
                    counsellor_profile = CounsellorProfile.objects.get(id=counsellor_id)
                    counsellor = counsellor_profile.user
                    if counsellor.role != 'counsellor':
                        return Response(
                            {'detail': f'Counsellor not found. User role is {counsellor.role}.'},
                            status=status.HTTP_404_NOT_FOUND
                        )
                except CounsellorProfile.DoesNotExist:
                    return Response(
                        {'detail': f'Counsellor not found with ID: {counsellor_id}'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Get counsellor fee
            try:
                counsellor_profile = CounsellorProfile.objects.get(user=counsellor)
                amount = counsellor_profile.fees_per_session or Decimal('0.00')
            except CounsellorProfile.DoesNotExist:
                amount = Decimal('0.00')
            
            # Create appointment with pending payment
            appointment = Appointment.objects.create(
                client=user,
                counsellor=counsellor,
                appointment_date=appointment_date,
                duration_minutes=duration_minutes,
                amount=amount,
                payment_status=Appointment.PaymentStatus.PENDING,
                status=Appointment.Status.PENDING,
                notes=notes,
            )
            
            serializer = AppointmentSerializer(appointment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Unexpected error in CreateAppointmentView: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'An unexpected error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CreateRazorpayOrderView(APIView):
    """Create Razorpay order for payment."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if not razorpay_client:
            return Response(
                {'detail': 'Razorpay is not configured.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        serializer = RazorpayOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        appointment_id = serializer.validated_data['appointment_id']
        
        try:
            appointment = Appointment.objects.get(id=appointment_id, client=request.user)
        except Appointment.DoesNotExist:
            return Response(
                {'detail': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create Razorpay order
        amount_in_paise = int(appointment.amount * 100)  # Convert to paise
        
        order_data = {
            'amount': amount_in_paise,
            'currency': 'INR',
            'receipt': f'appointment_{appointment.id}',
            'notes': {
                'appointment_id': appointment.id,
                'client_email': appointment.client.email,
                'counsellor_email': appointment.counsellor.email,
            }
        }
        
        try:
            razorpay_order = razorpay_client.order.create(data=order_data)
            appointment.razorpay_order_id = razorpay_order['id']
            appointment.save(update_fields=['razorpay_order_id'])
            
            return Response({
                'order_id': razorpay_order['id'],
                'amount': razorpay_order['amount'],
                'currency': razorpay_order['currency'],
                'key': getattr(settings, 'RAZORPAY_KEY_ID', ''),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': f'Failed to create Razorpay order: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MockCreateRazorpayOrderView(APIView):
    """Create a mock Razorpay order for development/testing when Razorpay is not configured.

    POST /api/appointments/razorpay/mock/create-order/
    Body: { appointment_id: <int> }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Only enable mock in DEBUG to avoid accidental use in production
        if not getattr(settings, 'DEBUG', False):
            return Response({'detail': 'Mock payment endpoints are only available in DEBUG.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = RazorpayOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment_id = serializer.validated_data['appointment_id']

        try:
            appointment = Appointment.objects.get(id=appointment_id, client=request.user)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Create a fake order id and attach to appointment
        import time
        mock_order_id = f"mock_order_{appointment.id}_{int(time.time())}"
        appointment.razorpay_order_id = mock_order_id
        appointment.save(update_fields=['razorpay_order_id'])

        amount_in_paise = int((appointment.amount or 0) * 100)

        return Response({
            'order_id': mock_order_id,
            'amount': amount_in_paise,
            'currency': 'INR',
            'key': getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_mock'),
        }, status=status.HTTP_200_OK)


class VerifyRazorpayPaymentView(APIView):
    """Verify Razorpay payment and update appointment."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        
        try:
            if not razorpay_client:
                logger.error("Razorpay client is not configured")
                return Response(
                    {'detail': 'Razorpay is not configured.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            serializer = RazorpayPaymentVerificationSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Invalid serializer data: {serializer.errors}")
                return Response(
                    {'detail': 'Invalid payment data.', 'errors': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            appointment_id = serializer.validated_data['appointment_id']
            razorpay_order_id = serializer.validated_data['razorpay_order_id']
            razorpay_payment_id = serializer.validated_data['razorpay_payment_id']
            razorpay_signature = serializer.validated_data['razorpay_signature']
            
            logger.info(f"Verifying payment for appointment {appointment_id}, payment_id: {razorpay_payment_id}")
            
            try:
                appointment = Appointment.objects.get(id=appointment_id, client=request.user)
            except Appointment.DoesNotExist:
                logger.error(f"Appointment {appointment_id} not found for user {request.user.id}")
                return Response(
                    {'detail': 'Appointment not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verify payment signature
            key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
            if not key_secret:
                logger.error("RAZORPAY_KEY_SECRET is not configured")
                return Response(
                    {'detail': 'Payment verification service is not configured.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            message = f"{razorpay_order_id}|{razorpay_payment_id}"
            generated_signature = hmac.new(
                key_secret.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if generated_signature != razorpay_signature:
                logger.warning(f"Signature verification failed for payment {razorpay_payment_id}")
                appointment.payment_status = Appointment.PaymentStatus.FAILED
                appointment.save(update_fields=['payment_status'])
                return Response(
                    {'detail': 'Payment verification failed. Invalid signature.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify payment with Razorpay
            try:
                logger.info(f"Fetching payment from Razorpay: {razorpay_payment_id}")
                payment = razorpay_client.payment.fetch(razorpay_payment_id)
                logger.info(f"Payment status from Razorpay: {payment.get('status')}")
                
                if payment['status'] == 'authorized' or payment['status'] == 'captured':
                    # Generate Google Meet link (you can integrate Google Calendar API here)
                    # For now, we'll create a placeholder link
                    google_meet_link = appointment.google_meet_link
                    if not google_meet_link:
                        try:
                            meet_code = appointment.generate_meet_code()
                            google_meet_link = f"https://meet.google.com/{meet_code}"
                            logger.info(f"Generated Google Meet link: {google_meet_link}")
                        except Exception as meet_error:
                            logger.error(f"Error generating meet code: {meet_error}", exc_info=True)
                            # Continue without meet link if generation fails
                            google_meet_link = None
                    
                    # Generate feedback form URL (you can create a Google Form and use its URL)
                    # For now, we'll use a placeholder URL that can be customized
                    feedback_form_url = appointment.feedback_form_url
                    if not feedback_form_url:
                        try:
                            # Default feedback form URL - replace with your actual Google Form URL
                            # To create a Google Form:
                            # 1. Go to https://forms.google.com
                            # 2. Create a new form
                            # 3. Click "Send" and copy the form link
                            # 4. Update FEEDBACK_FORM_URL in settings.py or use the default below
                            default_feedback_url = getattr(settings, 'FEEDBACK_FORM_URL', 'https://docs.google.com/forms/d/e/1FAIpQLSdEXAMPLE/viewform')
                            # Append appointment ID as a parameter for tracking
                            feedback_form_url = f"{default_feedback_url}?entry.1234567890=appointment_{appointment.id}"
                            logger.info(f"Set feedback form URL: {feedback_form_url}")
                        except Exception as feedback_error:
                            logger.error(f"Error setting feedback form URL: {feedback_error}", exc_info=True)
                            # Continue without feedback form URL if setting fails
                            feedback_form_url = None
                    
                    # Update appointment fields
                    appointment.payment_status = Appointment.PaymentStatus.PAID
                    appointment.status = Appointment.Status.CONFIRMED
                    appointment.razorpay_payment_id = razorpay_payment_id
                    appointment.razorpay_signature = razorpay_signature
                    if google_meet_link:
                        appointment.google_meet_link = google_meet_link
                    if feedback_form_url:
                        appointment.feedback_form_url = feedback_form_url
                    
                    # Prepare update fields list
                    update_fields = [
                        'payment_status',
                        'status',
                        'razorpay_payment_id',
                        'razorpay_signature',
                    ]
                    
                    # Only add optional fields if they were set
                    if google_meet_link:
                        update_fields.append('google_meet_link')
                    if feedback_form_url:
                        update_fields.append('feedback_form_url')
                    
                    try:
                        appointment.save(update_fields=update_fields)
                        print(f"Appointment {appointment.id} updated: payment_status={appointment.payment_status}, google_meet_link={appointment.google_meet_link}, feedback_form_url={appointment.feedback_form_url}")
                    except Exception as save_error:
                        logger.error(f"Error saving appointment: {save_error}", exc_info=True)
                        return Response(
                            {'detail': f'Failed to save appointment: {str(save_error)}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
                    
                    try:
                        serializer = AppointmentSerializer(appointment)
                        return Response(serializer.data, status=status.HTTP_200_OK)
                    except Exception as serialize_error:
                        logger.error(f"Error serializing appointment: {serialize_error}", exc_info=True)
                        return Response(
                            {'detail': f'Payment verified but failed to return appointment data: {str(serialize_error)}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
                else:
                    appointment.payment_status = Appointment.PaymentStatus.FAILED
                    appointment.save(update_fields=['payment_status'])
                    return Response(
                        {'detail': f'Payment status is {payment["status"]}.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as razorpay_error:
                logger.error(f"Razorpay API error: {str(razorpay_error)}", exc_info=True)
                # Check if it's a Razorpay-specific error
                if hasattr(razorpay_error, 'error'):
                    error_code = razorpay_error.error.get('code', 'UNKNOWN') if hasattr(razorpay_error.error, 'get') else 'UNKNOWN'
                    error_desc = razorpay_error.error.get('description', str(razorpay_error)) if hasattr(razorpay_error.error, 'get') else str(razorpay_error)
                    return Response(
                        {'detail': f'Razorpay error: {error_desc}', 'error_code': error_code},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                return Response(
                    {'detail': f'Failed to verify payment with Razorpay: {str(razorpay_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            logger.error(f"Unexpected error in payment verification: {str(e)}", exc_info=True)
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Ensure we always return JSON, not HTML
            return Response(
                {'detail': f'An unexpected error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MockVerifyRazorpayPaymentView(APIView):
    """Mock verification endpoint for development — marks appointment as paid without calling Razorpay.

    POST /api/appointments/razorpay/mock/verify-payment/
    Body: {
      appointment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(settings, 'DEBUG', False):
            return Response({'detail': 'Mock payment endpoints are only available in DEBUG.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = RazorpayPaymentVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment_id = serializer.validated_data['appointment_id']
        razorpay_order_id = serializer.validated_data.get('razorpay_order_id')
        razorpay_payment_id = serializer.validated_data.get('razorpay_payment_id') or f"mock_payment_{appointment_id}"
        razorpay_signature = serializer.validated_data.get('razorpay_signature') or 'mock_signature'

        try:
            appointment = Appointment.objects.get(id=appointment_id, client=request.user)
        except Appointment.DoesNotExist:
            return Response({'detail': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Mark as paid and confirmed
        appointment.payment_status = Appointment.PaymentStatus.PAID
        appointment.status = Appointment.Status.CONFIRMED
        appointment.razorpay_payment_id = razorpay_payment_id
        appointment.razorpay_signature = razorpay_signature

        # Generate Google Meet link and feedback URL similar to real flow
        try:
            if not appointment.google_meet_link:
                meet_code = appointment.generate_meet_code()
                appointment.google_meet_link = f"https://meet.google.com/{meet_code}"
        except Exception:
            appointment.google_meet_link = None

        if not appointment.feedback_form_url:
            default_feedback_url = getattr(settings, 'FEEDBACK_FORM_URL', 'https://docs.google.com/forms/d/e/1FAIpQLSdEXAMPLE/viewform')
            appointment.feedback_form_url = f"{default_feedback_url}?entry.1234567890=appointment_{appointment.id}"

        update_fields = ['payment_status', 'status', 'razorpay_payment_id', 'razorpay_signature', 'google_meet_link', 'feedback_form_url']
        appointment.save(update_fields=[f for f in update_fields if getattr(appointment, f, None) is not None])

        serializer_out = AppointmentSerializer(appointment)
        return Response(serializer_out.data, status=status.HTTP_200_OK)


class AppointmentDetailView(APIView):
    """Get, update, or delete a specific appointment."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, appointment_id):
        try:
            appointment = Appointment.objects.get(
                Q(id=appointment_id) & (Q(client=request.user) | Q(counsellor=request.user))
            )
        except Appointment.DoesNotExist:
            return Response(
                {'detail': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RescheduleAppointmentView(APIView):
    """Reschedule an existing appointment."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from apps.accounts.models import UnavailableDate
        from datetime import timedelta
        
        serializer = RescheduleAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        appointment_id = serializer.validated_data['appointment_id']
        new_appointment_date = serializer.validated_data['new_appointment_date']
        duration_minutes = serializer.validated_data.get('duration_minutes', 60)
        
        try:
            appointment = Appointment.objects.get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response(
                {'detail': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is the client (only clients can reschedule)
        if appointment.client != request.user:
            return Response(
                {'detail': 'Only the client can reschedule this appointment.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if appointment is paid
        if appointment.payment_status != Appointment.PaymentStatus.PAID:
            return Response(
                {'detail': 'Only paid appointments can be rescheduled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if appointment is not completed or cancelled
        if appointment.status in [Appointment.Status.COMPLETED, Appointment.Status.CANCELLED]:
            return Response(
                {'detail': 'Completed or cancelled appointments cannot be rescheduled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if new date is in the future
        if new_appointment_date <= timezone.now():
            return Response(
                {'detail': 'New appointment date must be in the future.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        counsellor = appointment.counsellor
        
        # Check if counsellor is unavailable on this date
        appointment_date_only = new_appointment_date.date()
        if UnavailableDate.objects.filter(counsellor=counsellor, date=appointment_date_only).exists():
            unavailable_date = UnavailableDate.objects.get(counsellor=counsellor, date=appointment_date_only)
            return Response(
                {'detail': f'Counsellor is not available on this date. {unavailable_date.reason or ""}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if counsellor has another appointment at the same time
        end_time = new_appointment_date + timedelta(minutes=duration_minutes)
        conflicting_appointments = Appointment.objects.filter(
            counsellor=counsellor,
            status__in=[Appointment.Status.PENDING, Appointment.Status.CONFIRMED],
            appointment_date__lt=end_time,
        ).exclude(id=appointment_id)
        
        for conf_apt in conflicting_appointments:
            conf_end = conf_apt.appointment_date + timedelta(minutes=conf_apt.duration_minutes)
            if new_appointment_date < conf_end and end_time > conf_apt.appointment_date:
                return Response(
                    {'detail': 'Counsellor has another appointment at this time. Please choose a different time.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update appointment
        appointment.appointment_date = new_appointment_date
        appointment.duration_minutes = duration_minutes
        appointment.save(update_fields=['appointment_date', 'duration_minutes', 'updated_at'])
        
        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CheckAvailabilityView(APIView):
    """Check counsellor availability for a specific date."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from apps.accounts.models import UnavailableDate
        from datetime import timedelta
        
        serializer = CheckAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        counsellor_id = serializer.validated_data['counsellor_id']
        check_date = serializer.validated_data['date']
        duration_minutes = serializer.validated_data.get('duration_minutes', 60)
        
        # Get counsellor
        try:
            counsellor = User.objects.get(id=counsellor_id, role='counsellor')
        except User.DoesNotExist:
            try:
                counsellor_profile = CounsellorProfile.objects.get(id=counsellor_id)
                counsellor = counsellor_profile.user
            except CounsellorProfile.DoesNotExist:
                return Response(
                    {'detail': 'Counsellor not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Check if counsellor is unavailable on this date
        is_unavailable = UnavailableDate.objects.filter(
            counsellor=counsellor,
            date=check_date
        ).exists()
        
        if is_unavailable:
            unavailable_date = UnavailableDate.objects.get(counsellor=counsellor, date=check_date)
            return Response({
                'available': False,
                'reason': unavailable_date.reason or 'Counsellor is not available on this date.',
                'date': check_date.isoformat()
            }, status=status.HTTP_200_OK)
        
        # Check if date is in the past
        if check_date < timezone.now().date():
            return Response({
                'available': False,
                'reason': 'Date is in the past.',
                'date': check_date.isoformat()
            }, status=status.HTTP_200_OK)
        
        # Get existing appointments for this date
        from datetime import datetime
        date_start = timezone.make_aware(datetime.combine(check_date, datetime.min.time()))
        date_end = date_start + timedelta(days=1)
        
        existing_appointments = Appointment.objects.filter(
            counsellor=counsellor,
            appointment_date__gte=date_start,
            appointment_date__lt=date_end,
            status__in=[Appointment.Status.PENDING, Appointment.Status.CONFIRMED]
        ).order_by('appointment_date')
        
        # Return availability info
        return Response({
            'available': True,
            'date': check_date.isoformat(),
            'existing_appointments': [
                {
                    'start': apt.appointment_date.isoformat(),
                    'end': (apt.appointment_date + timedelta(minutes=apt.duration_minutes)).isoformat(),
                    'duration_minutes': apt.duration_minutes
                }
                for apt in existing_appointments
            ],
            'message': 'Counsellor is available on this date.'
        }, status=status.HTTP_200_OK)

