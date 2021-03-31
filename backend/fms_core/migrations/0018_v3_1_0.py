# Generated by Django 3.1 on 2021-03-25 16:46

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import django.utils.timezone
import fms_core.schema_validators
import reversion


def init_tracking_importedfile(apps, schema_editor):
    ImportedFile = apps.get_model("fms_core", "ImportedFile")
    admin_id = User.objects.get(username="biobankadmin").id
    for entry in ImportedFile.objects.all().iterator():
        entry.created_at = entry.added
        entry.created_by = entry.imported_by
        entry.updated_by_id = admin_id
        entry.save()

def init_tracking(apps, schema_editor):
    Container = apps.get_model("fms_core", "Container")
    Sample = apps.get_model("fms_core", "Sample")
    Individual = apps.get_model("fms_core", "Individual")
    Version = apps.get_model("reversion", "Version")
    Revision = apps.get_model("reversion", "Revision")

    # Preloading in a dictionary information needed about Revisions
    revisions_dictionary = {}
    for revision in Revision.objects.values('pk', 'user_id', 'date_created'):
        revisions_dictionary[revision['pk']] = {'user_id': revision['user_id'], 'revision_date': revision['date_created']}

    # Create a version for each entity with the new tracking fields
    with reversion.create_revision(manage_manually=True):
        reversion.set_comment("Addition of tracking fields.")

        for container in Container.objects.all().iterator():
            versions = Version.objects.filter(content_type__model="container", object_id=container.id)
            first_version = versions.last()
            latest_version = versions.first()
            container.created_at = revisions_dictionary[first_version.revision_id]['revision_date']
            container.created_by_id = revisions_dictionary[first_version.revision_id]['user_id']
            container.updated_at = revisions_dictionary[latest_version.revision_id]['revision_date']
            container.updated_by_id = revisions_dictionary[latest_version.revision_id]['user_id']
            container.save()
            reversion.add_to_revision(container)

        for individual in Individual.objects.all().iterator():
            versions = Version.objects.filter(content_type__model="individual", object_id=individual.id)
            first_version = versions.last()
            latest_version = versions.first()
            individual.created_at = revisions_dictionary[first_version.revision_id]['revision_date']
            individual.created_by_id = revisions_dictionary[first_version.revision_id]['user_id']
            individual.updated_at = revisions_dictionary[latest_version.revision_id]['revision_date']
            individual.updated_by_id = revisions_dictionary[latest_version.revision_id]['user_id']
            individual.save()
            reversion.add_to_revision(individual)

        for sample in Sample.objects.all().iterator():
            versions = Version.objects.filter(content_type__model="sample", object_id=sample.id)
            first_version = versions.last()
            latest_version = versions.first()
            sample.created_at = revisions_dictionary[first_version.revision_id]['revision_date']
            sample.created_by_id = revisions_dictionary[first_version.revision_id]['user_id']
            sample.updated_at = revisions_dictionary[latest_version.revision_id]['revision_date']
            sample.updated_by_id = revisions_dictionary[latest_version.revision_id]['user_id']
            sample.save()
            reversion.add_to_revision(sample)

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0017_v3_1_0'),
    ]

    operations = [
        # Setting tracking for ImportedFile
        migrations.AddField(
            model_name='importedfile',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now, help_text='Date the instance was created.'),
        ),
        migrations.AddField(
            model_name='importedfile',
            name='created_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fms_core_importedfile_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='importedfile',
            name='deleted',
            field=models.BooleanField(default=False, help_text='Whether this instance has been deleted.'),
        ),
        migrations.AddField(
            model_name='importedfile',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, help_text='Date the instance was modified.'),
        ),
        migrations.AddField(
            model_name='importedfile',
            name='updated_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fms_core_importedfile_modification', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(
            init_tracking_importedfile,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='importedfile',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.'),
        ),
        migrations.RemoveField(
            model_name='importedfile',
            name='added',
        ),
        migrations.RemoveField(
            model_name='importedfile',
            name='imported_by',
        ),

        # Setting tracking for Container, Individual, Container
        migrations.AddField(
            model_name='container',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now, help_text='Date the instance was created.'),
        ),
        migrations.AddField(
            model_name='container',
            name='created_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fms_core_container_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='container',
            name='deleted',
            field=models.BooleanField(default=False, help_text='Whether this instance has been deleted.'),
        ),
        migrations.AddField(
            model_name='container',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, blank=True, help_text='Date the instance was modified.'),
        ),
        migrations.AddField(
            model_name='container',
            name='updated_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fms_core_container_modification', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='individual',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now, help_text='Date the instance was created.'),
        ),
        migrations.AddField(
            model_name='individual',
            name='created_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fms_core_individual_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='individual',
            name='deleted',
            field=models.BooleanField(default=False, help_text='Whether this instance has been deleted.'),
        ),
        migrations.AddField(
            model_name='individual',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, help_text='Date the instance was modified.'),
        ),
        migrations.AddField(
            model_name='individual',
            name='updated_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fms_core_individual_modification', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='sample',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now, help_text='Date the instance was created.'),
        ),
        migrations.AddField(
            model_name='sample',
            name='created_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fms_core_sample_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='sample',
            name='deleted',
            field=models.BooleanField(default=False, help_text='Whether this instance has been deleted.'),
        ),
        migrations.AddField(
            model_name='sample',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, help_text='Date the instance was modified.'),
        ),
        migrations.AddField(
            model_name='sample',
            name='updated_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fms_core_sample_modification', to=settings.AUTH_USER_MODEL),
        ),

        # Migration operation for extracting data from reversion and putting it into new tracking fields
        migrations.RunPython(
            init_tracking,
            reverse_code=migrations.RunPython.noop,
        ),

        # Modify created_at with auto_add_now=True for Container, Individual and Sample
        migrations.AlterField(
            model_name='container',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.'),
        ),
        migrations.AlterField(
            model_name='individual',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.'),
        ),

        # Modify created_by and updated_by for each Model
        migrations.AlterField(
            model_name='importedfile',
            name='created_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=models.PROTECT,
                                    related_name='fms_core_importedfile_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='importedfile',
            name='updated_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=models.PROTECT,
                                    related_name='fms_core_importedfile_modification', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='sample',
            name='created_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=models.PROTECT,
                                    related_name='fms_core_sample_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='sample',
            name='updated_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=models.PROTECT,
                                    related_name='fms_core_sample_modification', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='container',
            name='created_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=models.PROTECT,
                                    related_name='fms_core_container_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='container',
            name='updated_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=models.PROTECT,
                                    related_name='fms_core_container_modification', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='individual',
            name='created_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=models.PROTECT,
                                    related_name='fms_core_individual_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='individual',
            name='updated_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=models.PROTECT,
                                    related_name='fms_core_individual_modification', to=settings.AUTH_USER_MODEL),
        ),

    ]
