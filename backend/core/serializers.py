from rest_framework import serializers
from .models import User, VolunteerProfile, Report, AssignmentRequest
from django.contrib.auth import authenticate

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'email', 'role', 'phone', 'city', 'age', 'password']
        extra_kwargs = {'password': {'write_only': True}}
        
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class VolunteerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = VolunteerProfile
        fields = ['id', 'user', 'resume', 'is_approved', 'application_status', 'working_area_lat', 'working_area_long', 'is_active']
        
class ReportSerializer(serializers.ModelSerializer):
    reporter_details = UserSerializer(source='reporter', read_only=True)
    assigned_volunteer_details = UserSerializer(source='assigned_volunteer', read_only=True)
    
    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ['reporter', 'created_at']

class AssignmentRequestSerializer(serializers.ModelSerializer):
    report_details = ReportSerializer(source='report', read_only=True)
    volunteer_details = UserSerializer(source='volunteer', read_only=True)

    class Meta:
        model = AssignmentRequest
        fields = '__all__'
        read_only_fields = ['status', 'created_at', 'volunteer']
