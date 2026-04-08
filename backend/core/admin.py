from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, VolunteerProfile, Report, AssignmentRequest, RecoveryCode


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'city', 'is_staff')
 

class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'reporter', 'status', 'language', 'created_at')
    list_filter = ('status', 'language')

class VolunteerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'application_status', 'is_approved', 'is_active')
    list_filter = ('application_status', 'is_approved', 'is_active')
    search_fields = ('user__username',)

class RecoveryCodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'is_used', 'created_at')
    list_filter = ('is_used',)
    search_fields = ('user__username', 'code')

class AssignmentRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'report', 'volunteer', 'status', 'created_at')
    list_filter = ('status',)

# Registering all your project's tables
admin.site.register(User, CustomUserAdmin)
admin.site.register(Report, ReportAdmin)
admin.site.register(VolunteerProfile, VolunteerProfileAdmin)
admin.site.register(AssignmentRequest, AssignmentRequestAdmin)
admin.site.register(RecoveryCode, RecoveryCodeAdmin)



