from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import register_user, check_volunteer_status, update_credentials, get_user_profile, ReportViewSet, VolunteerProfileViewSet, AssignmentRequestViewSet, request_otp, verify_otp, reset_password
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'volunteers', VolunteerProfileViewSet)
router.register(r'assignment-requests', AssignmentRequestViewSet, basename='assignment-request')

urlpatterns = [
    path('auth/register/', register_user, name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', get_user_profile, name='user_profile'),
    path('auth/volunteer/status/', check_volunteer_status, name='volunteer_status'),
    path('auth/update-credentials/', update_credentials, name='update_credentials'),
    path('auth/request-otp/', request_otp, name='request_otp'),
    path('auth/verify-otp/', verify_otp, name='verify_otp'),
    path('auth/reset-password/', reset_password, name='reset_password'),
    path('', include(router.urls)),
]
