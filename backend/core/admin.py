from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, VolunteerProfile, Report, AssignmentRequest, RecoveryCode, OTPCode


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'city', 'is_staff')
 

class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'reporter', 'status', 'language', 'created_at')
    list_filter = ('status', 'language')

# Registering all your project's tables
admin.site.register(User, CustomUserAdmin)
admin.site.register(Report, ReportAdmin)
admin.site.register(VolunteerProfile)
admin.site.register(AssignmentRequest)
admin.site.register(RecoveryCode)
admin.site.register(OTPCode)


