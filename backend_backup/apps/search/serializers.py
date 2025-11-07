from rest_framework import serializers
from apps.accounts.models import CounsellorProfile, Specialization

class SpecializationSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ("id", "name")


class CounsellorSearchSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_picture = serializers.CharField(source="user.profile_picture", read_only=True)
    specializations = SpecializationSimpleSerializer(many=True, read_only=True)
    fees_per_session = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)

    class Meta:
        model = CounsellorProfile
        fields = ("id", "full_name", "profile_picture", "specializations", "fees_per_session" , "experience" , "availability")

    def get_full_name(self, obj):
        # prefer full name, fallback to short name or email local part
        return obj.user.get_full_name() or obj.user.get_short_name()
