from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'client',
        'counsellor',
        'appointment_date',
        'amount',
        'payment_status',
        'status',
        'created_at',
    ]
    list_filter = ['payment_status', 'status', 'appointment_date', 'created_at']
    search_fields = ['client__email', 'counsellor__email', 'razorpay_order_id', 'razorpay_payment_id']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'appointment_date'



