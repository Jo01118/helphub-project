from django.apps import AppConfig
from django.db.models.signals import post_migrate

def create_default_admin(sender, **kwargs):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Ensure Admin
    if not User.objects.filter(username="Admin").exists():
        User.objects.create_superuser("Admin", "admin@helphub.com", "Admin", role="ADMIN", first_name="System", last_name="Admin")
    else:
        u = User.objects.get(username="Admin")
        u.set_password("Admin")
        u.save()

    # Ensure abc (User)
    if not User.objects.filter(username="abc").exists():
        User.objects.create_user(username="abc", password="abc", role="USER")
    else:
        u = User.objects.get(username="abc")
        u.set_password("abc")
        u.save()

    # Ensure abc_vol (Volunteer)
    if not User.objects.filter(username="abc_vol").exists():
        User.objects.create_user(username="abc_vol", password="abc", role="VOLUNTEER")
    else:
        u = User.objects.get(username="abc_vol")
        u.set_password("abc")
        u.save()

class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        # Using post_migrate is safer for deployment, but we can also ping it
        post_migrate.connect(create_default_admin, sender=self)
