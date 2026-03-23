# Generated manually
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_recoverycode'),
    ]

    operations = [
        migrations.AlterField(
            model_name='report',
            name='original_audio',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='report',
            name='photo',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='report',
            name='resolved_proof',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='volunteerprofile',
            name='resume',
            field=models.TextField(blank=True, null=True),
        ),
    ]
