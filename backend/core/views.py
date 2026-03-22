from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, VolunteerProfile, Report, AssignmentRequest
from .serializers import UserSerializer, VolunteerProfileSerializer, ReportSerializer, AssignmentRequestSerializer
from rest_framework.decorators import action

import uuid

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
            
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
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
            refresh = RefreshToken.for_user(user)
            return Response({
                "status": "APPROVED",
                "message": "Congratulations, you have been selected as a volunteer!",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
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
    refresh = RefreshToken.for_user(user)
    return Response({
        "message": "Credentials updated successfully.",
        "access": str(refresh.access_token),
        "refresh": str(refresh)
    })

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def get_user_profile(request):
    user = request.user
    if request.method == 'PATCH':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    return Response(UserSerializer(user).data)

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
            serializer.save(reporter=self.request.user)
        else:
            serializer.save()
            
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
