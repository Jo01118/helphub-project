from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import register_user, check_volunteer_status, update_credentials, get_user_profile, ReportViewSet, VolunteerProfileViewSet, AssignmentRequestViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'volunteers', VolunteerProfileViewSet)
router.register(r'assignment-requests', AssignmentRequestViewSet, basename='assignment-request')

urlpatterns = [
    path('auth/register/', register_user, name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', get_user_profile, name='user_profile'),
    path('auth/volunteer/status/', check_volunteer_status, name='volunteer_status'),
    path('auth/update-credentials/', update_credentials, name='update_credentials'),
    path('', include(router.urls)),
]
