import django.core.validators
import json
import re
import uuid

from django.db import migrations, models


# noinspection PyPep8Naming,PyUnusedLocal
def create_uuid(apps, schema_editor):
    Container = apps.get_model("fms_core", "Container")
    for container in Container.objects.all():
        container.id = uuid.uuid4()
        container.save()


# noinspection PyPep8Naming,PyUnusedLocal
def copy_container_ids(apps, schema_editor):
    Container = apps.get_model("fms_core", "Container")
    Sample = apps.get_model("fms_core", "Sample")
    Version = apps.get_model("reversion", "Version")

    all_container_barcodes = set(Container.objects.all().values_list("barcode", flat=True))
    barcode_uuid_map = dict(Container.objects.all().values_list("barcode", "id"))

    container_subquery = Container.objects.filter(barcode=models.OuterRef("location_old")).values_list("id")[:1]
    sample_subquery = Container.objects.filter(barcode=models.OuterRef("container_old")).values_list("id")[:1]

    Container.objects.update(location=models.Subquery(container_subquery))
    Sample.objects.update(container=models.Subquery(sample_subquery))

    for version in Version.objects.filter(content_type__model="container", object_id__in=all_container_barcodes):
        barcode = version.object_id

        # Convert barcode to UUID
        version.object_id = str(barcode_uuid_map[barcode])

        # Re-serialize data to fit new model
        data = json.loads(version.serialized_data)
        data[0]["pk"] = version.object_id
        data[0]["fields"]["barcode"] = barcode
        data[0]["fields"]["location"] = (
            str(barcode_uuid_map[data[0]["fields"]["location"]]) if data[0]["fields"]["location"] is not None else None)
        version.serialized_data = json.dumps(data)

        # Save to database
        version.save()

    for version in Version.objects.filter(content_type__model="sample"):
        # Fix old references to containers from samples
        data = json.loads(version.serialized_data)
        data[0]["fields"]["container"] = str(barcode_uuid_map[data[0]["fields"]["container"]])
        version.serialized_data = json.dumps(data)

        # Save to database
        version.save()


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0004_v1_4_0'),
        ('reversion', '0001_squashed_0004_auto_20160611_1202'),
    ]

    operations = [
        # Create a unique UUID field, with values for each existing container
        #  - Create the id field, but nullable
        migrations.AddField(
            model_name='container',
            name='id',
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        #  - Create a UUID for each existing container
        migrations.RunPython(create_uuid, reverse_code=migrations.RunPython.noop),
        #  - Make the UUID field not null and unqieu
        migrations.AlterField(
            model_name='container',
            name='id',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),

        # Transform existing foreign keys into normal CharFields to not cause integrity errors
        migrations.AlterField(
            model_name='container',
            name='location',
            field=models.CharField(blank=True, null=True, max_length=200),
        ),
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.CharField(blank=True, max_length=200),
        ),

        # Make the new ID field on container the primary key
        migrations.AlterField(
            model_name='container',
            name='barcode',
            field=models.CharField(
                unique=True,
                max_length=200,
                help_text="Unique container barcode.",
                validators=[django.core.validators.RegexValidator(re.compile(r"^[a-zA-Z0-9.\-_]+$"))],
            ),
        ),
        migrations.AlterField(
            model_name='container',
            name='id',
            field=models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True),
        ),

        # Rename old foreign keys to make way for the new ones
        migrations.RenameField(
            model_name='container',
            old_name='location',
            new_name='location_old',
        ),
        migrations.RenameField(
            model_name='sample',
            old_name='container',
            new_name='container_old',
        ),

        # Add new foreign keys to link with UUIDs
        migrations.AddField(
            model_name='container',
            name='location',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.PROTECT,
                related_name="children",
                help_text="An existing (parent) container this container is located inside of.",
                limit_choices_to={"kind__in": (
                    'tube box 8x8',
                    'tube box 9x9',
                    'tube box 10x10',
                    'tube rack 8x12',
                    'drawer',
                    'freezer rack 4x4',
                    'freezer rack 7x4',
                    'freezer rack 8x6',
                    'freezer rack 11x6',
                    'freezer 3 shelves',
                    'freezer 5 shelves',
                    'room',
                    'box',
                )},
                to="fms_core.Container",
            ),
        ),
        migrations.AddField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.PROTECT,
                related_name="samples",
                limit_choices_to={"kind__in": ('96-well plate', '384-well plate', 'tube')},
                help_text="Designated location of the sample.",
                to="fms_core.Container",
            ),
        ),
        migrations.RunPython(
            copy_container_ids,
            reverse_code=migrations.RunPython.noop,
        ),

        # Make sample container field non-null
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name="samples",
                limit_choices_to={"kind__in": ('96-well plate', '384-well plate', 'tube')},
                help_text="Designated location of the sample.",
                to="fms_core.Container",
            ),
        ),

        # Fix sample unique together constraint
        migrations.AlterUniqueTogether(
            name='sample',
            unique_together={('container', 'coordinates')},
        ),

        # Remove old foreign key fields
        migrations.RemoveField(
            model_name='container',
            name='location_old',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='container_old',
        ),
    ]
