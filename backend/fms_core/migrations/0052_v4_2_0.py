from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import re
from django.contrib.auth.models import User
import reversion

from fms_core.models._constants import SampleType

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

def insert_transfer_into_workflows(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")
    Workflow = apps.get_model("fms_core", "Workflow")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Insert a transfer step before each Library QC step.")
        reversion.set_user(admin_user)

        # Create a generic transfer step
        protocol = Protocol.objects.get(name="Transfer")
        step = Step.objects.create(name="Transfer for library QC",
                                   protocol=protocol,
                                   expected_sample_type=SampleType.LIBRARY,
                                   created_by_id=admin_user_id,
                                   updated_by_id=admin_user_id)
        reversion.add_to_revision(step)

        for workflow in Workflow.objects.all():
            order_shift = StepOrder.objects.filter(workflow_id=workflow.id, step__name="Library QC").count()
            last_step_order = None
            if order_shift > 0:
                for step_order in StepOrder.objects.filter(workflow_id=workflow.id).order_by("-order"):
                    last_step_order = step_order
                    if step_order.next_step_order is not None and step_order.next_step_order.step.name == "Library QC":
                        # Create new step_order at the position of the step_order preceding the library QC
                        new_step_order = StepOrder.objects.create(workflow=workflow,
                                                                  step=step,
                                                                  next_step_order=step_order.next_step_order,
                                                                  order=step_order.order + order_shift,
                                                                  created_by_id=admin_user_id,
                                                                  updated_by_id=admin_user_id)
                        reversion.add_to_revision(new_step_order)
                        order_shift -= 1
                        # Change the current step order by the new step order created
                        step_order.next_step_order = new_step_order
                        step_order.order += order_shift
                        step_order.save()
                        reversion.add_to_revision(step_order)
                    else:
                        step_order.order += order_shift
                        step_order.save()
                        reversion.add_to_revision(step_order)
                if last_step_order.step.name == "Library QC":
                    new_step_order = StepOrder.objects.create(workflow=workflow,
                                                              step=step,
                                                              next_step_order=last_step_order,
                                                              order=1,
                                                              created_by_id=admin_user_id,
                                                              updated_by_id=admin_user_id)
                    reversion.add_to_revision(new_step_order)

def remove_library_normalization_from_workflows(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Workflow = apps.get_model("fms_core", "Workflow")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Replace Normalization + Pooling steps by a single normalization and pooling step in workflows.")
        reversion.set_user(admin_user)

        # Rename Pooling step to better explain the role.
        pooling_step = Step.objects.get(name="Pooling")
        pooling_step.name = "Normalization and Pooling"
        pooling_step.save()
        reversion.add_to_revision(pooling_step)

        for workflow in Workflow.objects.all():
            order_shift = 0
            last_step_order = None
            for step_order in StepOrder.objects.filter(workflow_id=workflow.id).order_by("order"):
                last_step_order = step_order
                if step_order.next_step_order is not None and step_order.next_step_order.step.name == "Normalization (Library)":
                    # Change the current step order by the twice remote step order
                    removed_step_order = step_order.next_step_order
                    step_order.next_step_order = step_order.next_step_order.next_step_order
                    step_order.order += order_shift
                    step_order.save()
                    reversion.add_to_revision(step_order)
                    removed_step_order.delete() # Remove Normalization (Library) step order
                    order_shift -= 1
                elif order_shift < 0 and step_order.step.name != "Normalization (Library)":
                    step_order.order += order_shift
                    step_order.save()
                    reversion.add_to_revision(step_order)
            if last_step_order.step.name == "Normalization (Library)":
                last_step_order.delete() # Remove Normalization (Library) step order

        # Remove the unused Normalization (Library) step
        normalization_step = Step.objects.get(name="Normalization (Library)")
        for specification in normalization_step.step_specifications.all():
            specification.delete()
        normalization_step.delete()

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
        migrations.RunPython(
            insert_transfer_into_workflows,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            remove_library_normalization_from_workflows,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
