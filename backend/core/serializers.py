from rest_framework import serializers
from .models import User, VolunteerProfile, Report, AssignmentRequest
from django.contrib.auth import authenticate
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from datetime import timedelta

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        refresh = self.get_token(self.user)
        
        if self.user.role == 'ADMIN' or self.user.is_superuser:
            refresh.set_exp(lifetime=timedelta(days=365))
            access_token = refresh.access_token
            access_token.set_exp(lifetime=timedelta(days=365))
        else:
            refresh.set_exp(lifetime=timedelta(hours=42))
            access_token = refresh.access_token
            access_token.set_exp(lifetime=timedelta(hours=42))

        data["refresh"] = str(refresh)
        data["access"] = str(access_token)
        
        return data

class UserSerializer(serializers.ModelSerializer):
    recovery_codes = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'email', 'role', 'phone', 'city', 'age', 'password', 'recovery_codes']
        extra_kwargs = {'password': {'write_only': True}}
        
    def get_recovery_codes(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user == obj:
            return list(obj.recovery_codes.filter(is_used=False).values_list('code', flat=True))
        return []

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
