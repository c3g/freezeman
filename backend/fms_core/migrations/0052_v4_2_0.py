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
    Sample = apps.get_model("fms_core", "Sample")
    Container = apps.get_model("fms_core", "Container")

    coords_to_pk = {}

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Initialize coordinates currently used for containers.")
        reversion.set_user(admin_user)

        # Create all coordinates for a square matrix using all possible letters. Spec will decide if they are valid for a container.
        for row in range(0, 26):          # 384 well-plate has 16 row, but there is a 21 row box
            for column in range(0, 26):   # 384 well-plate has 24 columns
                coordinate = Coordinate.objects.create(name=chr(row+65)+f"{column+1:02}",  # Uses Capitalized letters and zero-pad column to 2 pos
                                                       row=row,
                                                       column=column,
                                                       created_by_id=admin_user_id,
                                                       updated_by_id=admin_user_id)
                coords_to_pk[coordinate.name] = coordinate.id
                reversion.add_to_revision(coordinate)
        
        for coord, fk in coords_to_pk.items():
            # Bulk updates ... will not update the revisions 
            Sample.objects.filter(coordinates=coord).update(coordinate_id=fk)
            Container.objects.filter(coordinates=coord).update(coordinate_id=fk)

    # Quick check to make sure all coordinates were allocated
    assert Sample.objects.exclude(coordinates__exact="").filter(coordinate__isnull=True).count() == 0
    assert Sample.objects.filter(coordinates__exact="", coordinate__isnull=False).count() == 0
    assert Container.objects.exclude(coordinates__exact="").filter(coordinate__isnull=True).count() == 0
    assert Container.objects.filter(coordinates__exact="", coordinate__isnull=False).count() == 0


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0051_v4_1_0'),
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
        migrations.AddField(
            model_name='container',
            name='coordinate',
            field=models.ForeignKey(blank=True, help_text='Coordinates of this container within the parent container.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='containers', to='fms_core.coordinate'),
        ),
        migrations.AddField(
            model_name='sample',
            name='coordinate',
            field=models.ForeignKey(blank=True, help_text='Coordinates of the sample in a sample holding container. Only applicable for containers that directly store samples with coordinates, e.g. plates.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='samples', to='fms_core.coordinate'),
        ),
        migrations.RunPython(
            initialize_coordinates,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterUniqueTogether(
            name='sample',
            unique_together={},
        ),
        migrations.AddConstraint(
            model_name='sample',
            constraint=models.UniqueConstraint(fields=('container', 'coordinate'), name='sample_container_coordinate_key'),
        ),
        migrations.RemoveField(
            model_name='container',
            name='coordinates',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='coordinates',
        ),
    ]
