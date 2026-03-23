from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, VolunteerProfile, Report, AssignmentRequest, RecoveryCode
from .serializers import UserSerializer, VolunteerProfileSerializer, ReportSerializer, AssignmentRequestSerializer
from rest_framework.decorators import action

import uuid
from datetime import timedelta

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    if user.role == 'ADMIN' or user.is_superuser:
        refresh.set_exp(lifetime=timedelta(days=365))
        access_token = refresh.access_token
        access_token.set_exp(lifetime=timedelta(days=365))
    else:
        refresh.set_exp(lifetime=timedelta(hours=42))
        access_token = refresh.access_token
        access_token.set_exp(lifetime=timedelta(hours=42))
    return str(refresh), str(access_token)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    data = request.data.copy()
    is_volunteer = data.get('role') == 'VOLUNTEER'
    
    if is_volunteer:
        # Auto-generate a unique Volunteer Application ID and random password
        id_str = str(uuid.uuid4()).replace('-', '')
        generated_id = f"VOL-{id_str[:6].upper()}"
        data['username'] = generated_id
        data['password'] = id_str

        
    serializer = UserSerializer(data=data)
    if serializer.is_valid():
        user = serializer.save()
        
        import string
        import random
        for _ in range(4):
            code_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            while RecoveryCode.objects.filter(code=code_str).exists():
                code_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            RecoveryCode.objects.create(user=user, code=code_str)

        if is_volunteer:
            vp = VolunteerProfile.objects.create(user=user)
            resume_file = request.FILES.get('resume')
            if resume_file:
                vp.resume = resume_file
                
            lat = request.data.get('working_area_lat')
            lng = request.data.get('working_area_long')
            if lat and lng:
                try:
                    vp.working_area_lat = float(lat)
                    vp.working_area_long = float(lng)
                except ValueError:
                    pass
            vp.save()
            return Response({
                'volunteer_id': user.username,
                'message': 'Application submitted successfully.'
            }, status=status.HTTP_201_CREATED)
            
        refresh_token, access_token = get_tokens_for_user(user)
        return Response({
            'refresh': refresh_token,
            'access': access_token,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def check_volunteer_status(request):
    vid = request.data.get('volunteer_id')
    if not vid:
        return Response({"error": "Volunteer ID required."}, status=400)
    try:
        user = User.objects.get(username=vid.strip().upper(), role='VOLUNTEER')
        vp = user.volunteer_profile
        
        if vp.application_status == 'PENDING':
            return Response({"status": "PENDING", "message": "Your application is currently under review."})
        elif vp.application_status == 'REJECTED':
            return Response({"status": "REJECTED", "message": "Sorry, we regret to tell you you are not selected."})
        elif vp.application_status == 'APPROVED':
            refresh_token, access_token = get_tokens_for_user(user)
            return Response({
                "status": "APPROVED",
                "message": "Congratulations, you have been selected as a volunteer!",
                "access": access_token,
                "refresh": refresh_token,
                "user": UserSerializer(user).data
            })
    except User.DoesNotExist:
        return Response({"error": "Invalid Volunteer ID."}, status=404)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_credentials(request):
    user = request.user
    new_username = request.data.get('username')
    new_password = request.data.get('password')
    
    if not new_username or not new_password:
        return Response({"error": "Username and password required."}, status=400)
        
    if User.objects.exclude(pk=user.pk).filter(username=new_username).exists():
        return Response({"error": "Username already taken."}, status=400)
        
    user.username = new_username
    user.set_password(new_password)
    user.save()
    
    # Generate new tokens since credentials changed
    refresh_token, access_token = get_tokens_for_user(user)
    return Response({
        "message": "Credentials updated successfully.",
        "access": access_token,
        "refresh": refresh_token
    })

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def get_user_profile(request):
    user = request.user
    
    if not RecoveryCode.objects.filter(user=user).exists():
        import string
        import random
        for _ in range(4):
            code_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            while RecoveryCode.objects.filter(code=code_str).exists():
                code_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            RecoveryCode.objects.create(user=user, code=code_str)

    if request.method == 'PATCH':
        serializer = UserSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    return Response(UserSerializer(user, context={'request': request}).data)

import random

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reset_password(request):
    identifier = request.data.get('identifier')
    recovery_code = request.data.get('recovery_code')
    new_password = request.data.get('new_password')
    
    if not identifier or not recovery_code or not new_password:
        return Response({"error": "Identifier, recovery code, and new password are all required."}, status=400)
        
    from django.db import models
    # Try finding user by email, exactly matched username, or phone. Excluding admin.
    user = User.objects.filter(models.Q(username=identifier) | models.Q(email=identifier) | models.Q(phone=identifier)).exclude(role='ADMIN').first()
    if not user:
        return Response({"error": "Account not found."}, status=404)
        
    code_obj = RecoveryCode.objects.filter(user=user, code=recovery_code, is_used=False).first()
    
    if not code_obj:
        return Response({"error": "Invalid or expired recovery code."}, status=400)
        
    code_obj.is_used = True
    code_obj.save()
    
    user.set_password(new_password)
    user.save()
    
    refresh_token, access_token = get_tokens_for_user(user)
    return Response({
        "message": "Password reset successfully using Recovery Code.",
        "access": access_token,
        "refresh": refresh_token,
        "user": UserSerializer(user).data
    })

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Report.objects.none()
        if user.role in ['ADMIN', 'VOLUNTEER'] or user.is_superuser:
            return Report.objects.all().order_by('-created_at')
        return Report.objects.filter(reporter=user).order_by('-created_at')
    
    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            report = serializer.save(reporter=self.request.user)
        else:
            report = serializer.save()
            
        import math
        from .models import VolunteerProfile
        
        # Check nearby volunteers
        volunteers = VolunteerProfile.objects.filter(is_approved=True, is_active=True, working_area_lat__isnull=False, working_area_long__isnull=False)
        nearby_found = False
        
        for v in volunteers:
            # Haversine distance
            lat1, lon1 = math.radians(report.latitude), math.radians(report.longitude)
            lat2, lon2 = math.radians(v.working_area_lat), math.radians(v.working_area_long)
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            distance = c * 6371 # km
            if distance <= 20: # 20km radius threshold
                nearby_found = True
                break
                
        if not nearby_found:
            recipient = ""
            if report.reporter and (report.reporter.email or report.reporter.phone):
                recipient = report.reporter.email or report.reporter.phone
            elif report.contact_info:
                recipient = report.contact_info
                
            if recipient:
                print(f"--- SIMULATED NOTIFICATION (No Nearby) ---")
                message_body = f"Update: We have received your HelpHub report. Currently, there are no nearby volunteers available. We will keep you updated."
                print(f"To: {recipient}\n{message_body}\n------------------------------")
                
                if '@' in recipient:
                    import threading
                    def send_async_email():
                        from django.core.mail import send_mail
                        from django.conf import settings
                        try:
                            send_mail('HelpHub - Report Status Update', message_body, settings.EMAIL_HOST_USER or 'noreply@helphub.com', [recipient], fail_silently=True)
                        except Exception as e:
                            print(f"Failed to send email: {e}")
                    threading.Thread(target=send_async_email).start()

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_admin_message = getattr(old_instance, 'admin_message', None)
        
        report = serializer.save()
        
        if report.admin_message and report.admin_message != old_admin_message:
            recipient = ""
            if report.reporter and (report.reporter.email or report.reporter.phone):
                recipient = report.reporter.email or report.reporter.phone
            elif report.contact_info:
                recipient = report.contact_info
                
            if recipient:
                print(f"--- SIMULATED NOTIFICATION (Admin Message) ---")
                message_body = f"Message from Admin regarding Report #{report.id}: {report.admin_message}"
                if report.status == 'RESOLVED' and report.resolved_proof:
                    proof_url = report.resolved_proof.url if hasattr(report.resolved_proof, 'url') else str(report.resolved_proof)
                    message_body += f"\n\nAttached Resolution Proof: {proof_url}"
                    
                print(f"To: {recipient}\n{message_body}\n------------------------------")
                
                if '@' in recipient:
                    import threading
                    def send_async_update():
                        from django.core.mail import send_mail
                        from django.conf import settings
                        try:
                            send_mail(f'HelpHub - Update on Report #{report.id}', message_body, settings.EMAIL_HOST_USER or 'noreply@helphub.com', [recipient], fail_silently=True)
                        except Exception as e:
                            print(f"Failed to send email: {e}")
                    threading.Thread(target=send_async_update).start()
                

class VolunteerProfileViewSet(viewsets.ModelViewSet):
    queryset = VolunteerProfile.objects.all()
    serializer_class = VolunteerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

class AssignmentRequestViewSet(viewsets.ModelViewSet):
    queryset = AssignmentRequest.objects.all()
    serializer_class = AssignmentRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', '') == 'ADMIN' or user.is_superuser:
            return AssignmentRequest.objects.all().order_by('-created_at')
        return AssignmentRequest.objects.filter(volunteer=user).order_by('-created_at')

    def perform_create(self, serializer):
        if self.request.user.role != 'VOLUNTEER':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Only volunteers can request assignments.")
            
        report_id = self.request.data.get('report')
        if AssignmentRequest.objects.filter(report_id=report_id, volunteer=self.request.user).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You have already requested to be assigned to this issue.")
            
        serializer.save(volunteer=self.request.user, status='PENDING')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role != 'ADMIN' and not request.user.is_superuser:
            return Response({"error": "Only admins can approve requests."}, status=status.HTTP_403_FORBIDDEN)
            
        assignment_req = self.get_object()
        
        if assignment_req.status != 'PENDING':
            return Response({"error": "This request is already processed."}, status=status.HTTP_400_BAD_REQUEST)
            
        report = assignment_req.report
        
        if report.status != 'PENDING':
            return Response({"error": "This report is already assigned or resolved."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Approve this request
        assignment_req.status = 'APPROVED'
        assignment_req.save()
        
        # Assign report
        report.status = 'IN_PROGRESS'
        report.assigned_volunteer = assignment_req.volunteer
        report.save()
        
        # Reject all others
        AssignmentRequest.objects.filter(report=report, status='PENDING').exclude(id=assignment_req.id).update(status='REJECTED')
        
        return Response({"status": "Success", "message": "Volunteer assigned."})
