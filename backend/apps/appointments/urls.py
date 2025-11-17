from django.urls import path
from .views import (
    AppointmentListView,
    CreateAppointmentView,
    CreateRazorpayOrderView,
    VerifyRazorpayPaymentView,
    MockCreateRazorpayOrderView,
    MockVerifyRazorpayPaymentView,
    AppointmentDetailView,
    RescheduleAppointmentView,
    CheckAvailabilityView,
)

app_name = 'appointments'

urlpatterns = [
    path('', AppointmentListView.as_view(), name='list'),
    path('create/', CreateAppointmentView.as_view(), name='create'),
    path('<int:appointment_id>/', AppointmentDetailView.as_view(), name='detail'),
    path('razorpay/create-order/', CreateRazorpayOrderView.as_view(), name='razorpay-create-order'),
    path('razorpay/verify-payment/', VerifyRazorpayPaymentView.as_view(), name='razorpay-verify-payment'),
    # Mock endpoints for development (only active when DEBUG=True)
    path('razorpay/mock/create-order/', MockCreateRazorpayOrderView.as_view(), name='razorpay-mock-create-order'),
    path('razorpay/mock/verify-payment/', MockVerifyRazorpayPaymentView.as_view(), name='razorpay-mock-verify-payment'),
    path('reschedule/', RescheduleAppointmentView.as_view(), name='reschedule'),
    path('check-availability/', CheckAvailabilityView.as_view(), name='check-availability'),
]



