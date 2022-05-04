import reversion
from django.db import migrations, models
from django.db.models import deletion
from django.db.models import Q
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def update_sample_kinds(apps, schema_editor):
    SampleKind = apps.get_model("fms_core", "SampleKind")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Update definitions of sample kinds to include is_extracted and concentration_required.")
        reversion.set_user(admin_user)

        # Only 2 extracted kind so far are DNA and RNA and DNA is the only with concentration required
        sample_kind = SampleKind.objects.get(name="DNA")
        sample_kind.is_extracted = True
        sample_kind.concentration_required = True
        sample_kind.save()
        reversion.add_to_revision(sample_kind)

        sample_kind = SampleKind.objects.get(name="RNA")
        sample_kind.is_extracted = True
        sample_kind.save()
        reversion.add_to_revision(sample_kind)

def add_tissue_source_as_sample_kinds(apps, schema_editor):
    SampleKind = apps.get_model("fms_core", "SampleKind")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Add new sample kinds that were exclusively tissue source.")
        reversion.set_user(admin_user)

        sample_kind = SampleKind.objects.create(name="TAIL",
                                                is_extracted=False,
                                                concentration_required=False,
                                                created_by_id=admin_user_id,
                                                updated_by_id=admin_user_id)
        reversion.add_to_revision(sample_kind)

        sample_kind = SampleKind.objects.create(name="TUMOR",
                                                is_extracted=False,
                                                concentration_required=False,
                                                created_by_id=admin_user_id,
                                                updated_by_id=admin_user_id)
        reversion.add_to_revision(sample_kind)

def initialize_tissue_source(apps, schema_editor):
    SampleKind = apps.get_model("fms_core", "SampleKind")
    DerivedSample = apps.get_model("fms_core", "DerivedSample")

    sample_kind_dic = {sample_kind.name: sample_kind.id for sample_kind in SampleKind.objects.all()}

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Replace string base tissue source by a foreign key to sample kind.")
        reversion.set_user(admin_user)

        for derived_sample in DerivedSample.objects.filter(Q(tissue_source__isnull=False) & ~Q(tissue_source="")):
            derived_sample.tissue_source_new = sample_kind_dic[derived_sample.tissue_source.upper()]
            derived_sample.save()
            reversion.add_to_revision(derived_sample)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0035_v3_8_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='samplekind',
            name='is_extracted',
            field=models.BooleanField(default=False, help_text='Indicator to identify kinds that were extracted. Sample will have tissue source.'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='samplekind',
            name='concentration_required',
            field=models.BooleanField(default=False, help_text='Sample kind requires a concentration value for sample processing.'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='derivedsample',
            name='sample_kind',
            field=models.ForeignKey(on_delete=deletion.PROTECT, to='fms_core.samplekind', related_name="kind_derived_samples",
                                    help_text='Biological material collected from study subject during the conduct of a genomic study project.'),
        ),
        migrations.AlterField(
            model_name='samplekind',
            name='molecule_ontology_curie',
            field=models.CharField(blank=True, help_text='SO ontology term to describe a molecule, such as ‘SO:0000991’ (‘genomic_DNA’).', max_length=20),
        ),
        migrations.RunPython(
            update_sample_kinds,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            add_tissue_source_as_sample_kinds,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AddField(
            model_name='derivedsample',
            name='tissue_source_new',
            field=models.IntegerField(blank=True, null=True, help_text='Can only be specified if the sample kind is DNA or RNA (i.e. is an extracted sample kind).'),
        ),
        migrations.RunPython(
            initialize_tissue_source,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='derivedsample',
            name='tissue_source',
        ),
        migrations.RenameField(
            model_name='derivedsample',
            old_name='tissue_source_new',
            new_name='tissue_source',
        ),
        migrations.AlterField(
            model_name='derivedsample',
            name='tissue_source',
            field=models.ForeignKey(blank=True, null=True, on_delete=deletion.PROTECT,
                                    to='fms_core.samplekind', related_name="source_derived_samples",
                                    help_text='Can only be specified if the sample kind is DNA or RNA (i.e. is an extracted sample kind).'),
        ),

    ]
