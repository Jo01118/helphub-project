from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('USER', 'User'),
        ('VOLUNTEER', 'Volunteer'),
        ('ADMIN', 'Admin'),
    )
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='USER')
    phone = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    age = models.IntegerField(null=True, blank=True)

class VolunteerProfile(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='volunteer_profile')
    resume = models.FileField(upload_to='resumes/', blank=True, null=True)
    is_approved = models.BooleanField(default=False)
    application_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    working_area_lat = models.FloatField(null=True, blank=True)
    working_area_long = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

class Report(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
    )
    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    text = models.TextField()
    original_audio = models.FileField(upload_to='audio/', blank=True, null=True)
    photo = models.ImageField(upload_to='photos/', blank=True, null=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    contact_info = models.CharField(max_length=100, blank=True, null=True)
    admin_message = models.TextField(blank=True, null=True)
    contact_request_reason = models.TextField(blank=True, null=True)
    contact_shared = models.BooleanField(default=False)
    resolved_proof = models.FileField(upload_to='resolutions/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    language = models.CharField(max_length=10, default='en')
    assigned_volunteer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_reports')

class AssignmentRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='assignment_requests')
    volunteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignment_requests', limit_choices_to={'role': 'VOLUNTEER'})
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('report', 'volunteer')

class OTPCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    
    def is_valid(self):
        from django.utils import timezone
        import datetime
        return not self.is_used and (timezone.now() - self.created_at) < datetime.timedelta(minutes=10)
