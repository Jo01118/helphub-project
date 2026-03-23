from django.apps import AppConfig
from django.db.models.signals import post_migrate

def create_default_admin(sender, **kwargs):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    if not User.objects.filter(username="Admin").exists():
        User.objects.create_superuser("Admin", "admin@helphub.com", "Admin123", role="ADMIN", first_name="System", last_name="Admin")

class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        post_migrate.connect(create_default_admin, sender=self)
