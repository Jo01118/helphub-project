import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
# Ensure Admin user
try:
    u = User.objects.get(username='Admin')
except User.DoesNotExist:
    u = User(username='Admin')
u.set_password('Admin')
u.is_superuser = True
u.is_staff = True
if hasattr(u, 'role'): u.role = 'ADMIN'
u.save()

# Ensure test user 'abc'
user_abc, _ = User.objects.get_or_create(username='abc')
user_abc.set_password('abc')
if hasattr(user_abc, 'role'): user_abc.role = 'USER'
user_abc.save()

# Ensure test volunteer 'abc_vol'
vol_abc, _ = User.objects.get_or_create(username='abc_vol')
vol_abc.set_password('abc')
if hasattr(vol_abc, 'role'): vol_abc.role = 'VOLUNTEER'
vol_abc.save()

print("Admin and test accounts (abc) reset and guaranteed.")
