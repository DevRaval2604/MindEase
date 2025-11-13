from rest_framework import serializers
<<<<<<< HEAD:backend/apps/search/serializers.py
from apps.accounts.models import CounsellorProfile, Specialization, AvailabilitySlot
=======
from apps.accounts.models import CounsellorProfile, Specialization
>>>>>>> 5854e658564d1d000f65d4d4959a8a542dd062b6:backend_backup/apps/search/serializers.py

class SpecializationSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ("id", "name")


<<<<<<< HEAD:backend/apps/search/serializers.py
class AvailabilitySlotSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ("id", "name")


=======
>>>>>>> 5854e658564d1d000f65d4d4959a8a542dd062b6:backend_backup/apps/search/serializers.py
class CounsellorSearchSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_picture = serializers.CharField(source="user.profile_picture", read_only=True)
    specializations = SpecializationSimpleSerializer(many=True, read_only=True)
<<<<<<< HEAD:backend/apps/search/serializers.py
    availability = AvailabilitySlotSimpleSerializer(many=True, read_only=True)
    fees_per_session = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    user = serializers.SerializerMethodField()

    class Meta:
        model = CounsellorProfile
        fields = ("id", "full_name", "profile_picture", "specializations", "fees_per_session" , "experience" , "availability", "user")
=======
    fees_per_session = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)

    class Meta:
        model = CounsellorProfile
        fields = ("id", "full_name", "profile_picture", "specializations", "fees_per_session" , "experience" , "availability")
>>>>>>> 5854e658564d1d000f65d4d4959a8a542dd062b6:backend_backup/apps/search/serializers.py

    def get_full_name(self, obj):
        # prefer full name, fallback to short name or email local part
        return obj.user.get_full_name() or obj.user.get_short_name()
<<<<<<< HEAD:backend/apps/search/serializers.py
    
    def get_user(self, obj):
        return {
            "id": obj.user.id,  # Include user ID for appointment creation
            "email": obj.user.email,
            "phone": obj.user.phone,
            "first_name": obj.user.first_name,
            "last_name": obj.user.last_name,
        }
=======
>>>>>>> 5854e658564d1d000f65d4d4959a8a542dd062b6:backend_backup/apps/search/serializers.py
