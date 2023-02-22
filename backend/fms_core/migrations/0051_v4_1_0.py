from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import re
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

def initialize_coordinates(apps, schema_editor):
    Coordinate = apps.get_model("fms_core", "Coordinate")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Initialize coordinates currently used for containers.")
        reversion.set_user(admin_user)

        for row in range(1, 17):          # 384 well-plate has 16 row
            for column in range(1, 25):   # 384 well-plate has 24 columns
                coordinate = Coordinate.objects.create(name=chr(row+64)+f"{column:02}",  # Uses Capitalized letters and zero-pad column to 2 pos
                                                       row=row,
                                                       column=column,
                                                       created_by_id=admin_user_id,
                                                       updated_by_id=admin_user_id)
                reversion.add_to_revision(coordinate)

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0050_v4_1_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='Coordinate',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='Unique alphanumeric name to identify a coordinate in a container.', max_length=10, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[A-Z]+[0-9]+$'))])),
                ('column', models.PositiveIntegerField(help_text='Numeric value of the container coordinate column.')),
                ('row', models.PositiveIntegerField(help_text='Numeric value of the container coordinate row.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_coordinate_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_coordinate_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RunPython(
            initialize_coordinates,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
