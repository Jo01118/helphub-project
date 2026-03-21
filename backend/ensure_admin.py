import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
try:
    u = User.objects.get(username='Admin')
except User.DoesNotExist:
    u = User(username='Admin')
u.set_password('Admin')
u.is_superuser = True
u.is_staff = True
if hasattr(u, 'role'):
    u.role = 'ADMIN'
u.save()
print("Admin user guaranteed with password 'Admin'")
