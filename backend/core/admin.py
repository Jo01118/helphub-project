from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import User, VolunteerProfile, Report, AssignmentRequest, RecoveryCode


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'city', 'is_staff')
 

class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'reporter', 'status', 'language', 'created_at')
    list_filter = ('status', 'language')

class VolunteerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'application_status', 'resume_link', 'is_approved', 'is_active')
    list_filter = ('application_status', 'is_approved', 'is_active')
    search_fields = ('user__username',)
    readonly_fields = ('resume_link',)

    def resume_link(self, obj):
        if obj.resume:
            if obj.resume.startswith('data:'):
                return format_html('<a href="{}" target="_blank">View Resume (Image/PDF)</a>', obj.resume)
            return format_html('<a href="{}" target="_blank">View Resume (File)</a>', obj.resume)
        return "No resume provided"
    resume_link.short_description = "Resume View"

class RecoveryCodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'is_used', 'created_at')
    list_filter = ('user', 'is_used')
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




