from rest_framework import serializers
from .models import Appointment
from apps.accounts.models import User, CounsellorProfile


class AppointmentSerializer(serializers.ModelSerializer):
    """Serializer for Appointment model."""
    client_email = serializers.EmailField(source='client.email', read_only=True)
    client_name = serializers.SerializerMethodField()
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    counsellor_email = serializers.EmailField(source='counsellor.email', read_only=True)
    counsellor_name = serializers.SerializerMethodField()
    counsellor_phone = serializers.CharField(source='counsellor.phone', read_only=True)
    counsellor_image = serializers.SerializerMethodField()
    counsellor_specializations = serializers.SerializerMethodField()
    counsellor_profile_id = serializers.SerializerMethodField()  # Add CounsellorProfile ID
    can_join_meet = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = [
            'id',
            'client',
            'client_email',
            'client_name',
            'client_phone',
            'counsellor',
            'counsellor_email',
            'counsellor_name',
            'counsellor_phone',
            'counsellor_image',
            'counsellor_specializations',
            'counsellor_profile_id',
            'appointment_date',
            'duration_minutes',
            'amount',
            'payment_status',
            'status',
            'google_meet_link',
            'notes',
            'feedback_submitted',
            'feedback_submitted_at',
            'feedback_form_url',
            'can_join_meet',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'can_join_meet',
        ]
    
    def get_client_name(self, obj):
        return obj.client.get_full_name() or obj.client.email
    
    def get_counsellor_name(self, obj):
        return obj.counsellor.get_full_name() or obj.counsellor.email
    
    def get_counsellor_image(self, obj):
        """Get counsellor profile picture from User model."""
        # profile_picture is on the User model, not CounsellorProfile
        if obj.counsellor and obj.counsellor.profile_picture:
            # Return the URL string (it's a URLField)
            return str(obj.counsellor.profile_picture)
        return None
    
    def get_counsellor_specializations(self, obj):
        """Get counsellor specializations from CounsellorProfile."""
        try:
            profile = CounsellorProfile.objects.get(user=obj.counsellor)
            return [s.name for s in profile.specializations.all()]
        except CounsellorProfile.DoesNotExist:
            return []
    
    def get_counsellor_profile_id(self, obj):
        """Get CounsellorProfile ID for frontend compatibility."""
        try:
            profile = CounsellorProfile.objects.get(user=obj.counsellor)
            return profile.id
        except CounsellorProfile.DoesNotExist:
            return None
    
    def get_can_join_meet(self, obj):
        """Check if user can join Google Meet (only on appointment date and if paid)."""
        return obj.can_join_meet()


class CreateAppointmentSerializer(serializers.Serializer):
    """Serializer for creating an appointment."""
    counsellor_id = serializers.IntegerField()
    appointment_date = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField(default=60)
    notes = serializers.CharField(required=False, allow_blank=True)


class RazorpayOrderSerializer(serializers.Serializer):
    """Serializer for Razorpay order creation."""
    appointment_id = serializers.IntegerField()


class RazorpayPaymentVerificationSerializer(serializers.Serializer):
    """Serializer for Razorpay payment verification."""
    appointment_id = serializers.IntegerField()
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()


class RescheduleAppointmentSerializer(serializers.Serializer):
    """Serializer for rescheduling an appointment."""
    appointment_id = serializers.IntegerField()
    new_appointment_date = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField(required=False, default=60)


class CheckAvailabilitySerializer(serializers.Serializer):
    """Serializer for checking counsellor availability."""
    counsellor_id = serializers.IntegerField()
    date = serializers.DateField()
    duration_minutes = serializers.IntegerField(required=False, default=60)

