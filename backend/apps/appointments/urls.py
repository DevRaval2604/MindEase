from django.urls import path
from .views import (
    AppointmentListView,
    CreateAppointmentView,
    CreateRazorpayOrderView,
    VerifyRazorpayPaymentView,
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
    path('reschedule/', RescheduleAppointmentView.as_view(), name='reschedule'),
    path('check-availability/', CheckAvailabilityView.as_view(), name='check-availability'),
]



