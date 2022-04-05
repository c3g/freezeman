from django.conf import settings
import django.core.validators
from django.contrib.auth.models import User
from django.db import migrations, models
import django.db.models.deletion
import re
import reversion

ADMIN_USERNAME = 'biobankadmin'

def initialize_taxons(apps, schema_editor):
    Taxon = apps.get_model("fms_core", "Taxon")
    Individual = apps.get_model("fms_core", "Individual")

    # List of existing Taxons in Freezeman
    TAXON_HOMO_SAPIENS = "Homo sapiens"
    TAXON_MUS_MUSCULUS = "Mus musculus"
    TAXON_SARS_COV_2 = "Sars-Cov-2"
    TAXON_IXODES_SCAPULARIS = "Ixodes scapularis"

    taxon_dict = { TAXON_HOMO_SAPIENS: 9606,
                   TAXON_MUS_MUSCULUS: 10090,
                   TAXON_SARS_COV_2: 2697049,
                   TAXON_IXODES_SCAPULARIS: 6945, }

    taxon_map = {}
    
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create taxons to support taxons currently used in Freezeman.")
        reversion.set_user(admin_user)

        for name, ncbi_id in taxon_dict.items():
            taxon = Taxon.objects.create(name=name, ncbi_id=ncbi_id, created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(taxon)
            taxon_map[name] = taxon.id

        for individual in Individual.objects.all():
            individual.taxon_new = taxon_map[individual.taxon]
            individual.save()
            reversion.add_to_revision(individual)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0033_v3_8_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='Taxon',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='Taxon scientific name.', max_length=200, unique=True)),
                ('ncbi_id', models.PositiveBigIntegerField(help_text='Numerical identifier used by the NCBI taxonomy catalog.', unique=True)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_taxon_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_taxon_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='individual',
            name='taxon_new',
            field=models.IntegerField(blank=True, null=True, help_text='Taxonomic entry associated to the individual.'),
        ),
        migrations.RunPython(
            initialize_taxons,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='individual',
            name='taxon',
        ),
        migrations.RenameField(
            model_name='individual',
            old_name='taxon_new',
            new_name='taxon',
        ),
        migrations.AlterField(
            model_name='individual',
            name='taxon',
            field=models.ForeignKey(help_text='Taxonomic entry associated to the individual.', on_delete=django.db.models.deletion.PROTECT, to='fms_core.taxon'),
        ),
    ]
