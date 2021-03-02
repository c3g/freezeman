# Generated by Django 3.1 on 2021-03-02 18:25

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import json

SAMPLE_KINDS = ['DNA', 'RNA', 'BAL', 'BLOOD', 'CELLS', 'EXPECTORATION', 'GARGLE', 'PLASMA', 'SALIVA', 'SWAB']

def create_sample_kinds(apps, schema_editor):
    SampleKind = apps.get_model("fms_core", "SampleKind")
    for kind in SAMPLE_KINDS:
        SampleKind.objects.create(name=kind)

def copy_samples_kinds(apps, schema_editor):
    Sample = apps.get_model("fms_core", "Sample")
    SampleKind = apps.get_model("fms_core", "SampleKind")
    sample_kind_ids_by_name = {sample_kind.name: sample_kind.id for sample_kind in SampleKind.objects.all()}

    for sample in Sample.objects.all():
        name = sample.biospecimen_type
        sample.sample_kind_id = sample_kind_ids_by_name[name]
        sample.save()

    # Deals with versions
    Version = apps.get_model("reversion", "Version")
    SampleKind = apps.get_model("fms_core", "SampleKind")
    sample_kind_ids_by_name = {sample_kind.name: sample_kind.id for sample_kind in SampleKind.objects.all()}

    for version in Version.objects.filter(content_type__model="sample"):
        data = json.loads(version.serialized_data)
        if 'biospecimen_type' in data[0]["fields"]:
            biospecimen_type = data[0]["fields"]["biospecimen_type"]
            data[0]["fields"]["sample_kind"] = sample_kind_ids_by_name[biospecimen_type]
            data[0]["fields"].pop("biospecimen_type", None)
        version.serialized_data = json.dumps(data)
        version.save()

def change_sample_versions_for_creation_date(apps, schema_editor):
    Version = apps.get_model("reversion", "Version")
    for version in Version.objects.filter(content_type__model="sample"):
        data = json.loads(version.serialized_data)
        data[0]["fields"]["creation_date"] = data[0]["fields"]["reception_date"]
        data[0]["fields"].pop("reception_date", None)
        version.serialized_data = json.dumps(data)
        version.save()

def initialize_protocols(apps, schema_editor):
    protocol_model = apps.get_model("fms_core", "protocol")
    protocol_model.objects.create(name="Extraction")

def create_lineage_from_extracted_and_revisions(apps, schema_editor):
    sample_model = apps.get_model("fms_core", "sample")
    sample_lineage_model = apps.get_model("fms_core", "samplelineage")
    protocol_model = apps.get_model("fms_core", "protocol")
    process_model = apps.get_model("fms_core", "process")
    process_sample_model = apps.get_model("fms_core", "processsample")
    revision_model = apps.get_model("reversion", "revision")
    version_model = apps.get_model("reversion", "version")

    extraction_protocol = protocol_model.objects.get(name="Extraction")
    extracted_samples_info = {}

    for revision in revision_model.objects.filter(comment="Imported extracted samples from template."):
        extracted_samples = version_model.objects.filter(revision_id=revision.id,
                                                         content_type__model="sample",
                                                         object_repr__icontains="(extracted, ")
        if extracted_samples:
            pr = process_model.objects.create(protocol=extraction_protocol, comment="Created from old extraction data.")
            for sample in extracted_samples:
                data = json.loads(sample.serialized_data)
                comment = data[0]["fields"].pop("comment", "")
                sample_info = {sample.object_id: {"process": pr, "comment": comment}}
                extracted_samples_info.update(sample_info)

    # Create process_by_sample and parent lineage for each sample that had an extracted_from fk
    for sample in sample_model.objects.all():
        if sample.old_extracted_from:
            process_sample_info = extracted_samples_info[str(sample.id)]
            if process_sample_info:
                ps = process_sample_model.objects.create(process=process_sample_info["process"],
                                                         source_sample=sample.old_extracted_from,
                                                         execution_date=sample.creation_date,
                                                         volume_used=sample.volume_used,
                                                         comment=process_sample_info["comment"])
                sample_lineage_model.objects.create(parent=sample.old_extracted_from,
                                                    child=sample,
                                                    process_sample=ps)
            else:
                raise

    for version in version_model.objects.filter(content_type__model="sample"):
        # Remove the extracted_from field from the serialized_data in version
        data = json.loads(version.serialized_data)
        data[0]["fields"].pop("extracted_from", None)
        data[0]["fields"].pop("volume_used", None)
        version.serialized_data = json.dumps(data)
        # Save to database
        version.save()


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0014_v3_0_3'),
    ]

    operations = [
        # Migrations related to SampleKind replacing Sample.biospecimen_type
        migrations.CreateModel(
            name='SampleKind',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Biological material collected from study subject during the conduct of a genomic study project.', max_length=200)),
                ('molecule_ontology_curie', models.CharField(blank=True, help_text='SO ontology term to describe an molecule, such as ‘SO:0000991’ (‘genomic_DNA’)', max_length=20)),
            ],
        ),
        migrations.AddField(
            model_name='sample',
            name='sample_kind',
            field=models.ForeignKey(
                blank=True,
                null=True,
                help_text='Biological material collected from study subject during the conduct of a genomic study project.',
                on_delete=django.db.models.deletion.PROTECT,
                to='fms_core.samplekind'),
        ),
        migrations.RunPython(
            create_sample_kinds,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            copy_samples_kinds,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='sample',
            name='biospecimen_type',
        ),
        migrations.AlterField(
            model_name='sample',
            name='sample_kind',
            field=models.ForeignKey(
                help_text='Biological material collected from study subject during the conduct of a genomic study project.',
                on_delete=django.db.models.deletion.PROTECT, to='fms_core.samplekind'),
        ),
        migrations.AlterField(
            model_name='samplekind',
            name='name',
            field=models.CharField(
                help_text='Biological material collected from study subject during the conduct of a genomic study project.',
                max_length=200, unique=True),
        ),
        # Migrations related to Process, Protocol and ProcessSample
        migrations.CreateModel(
            name='Process',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('comment', models.TextField(blank=True, help_text='Relevant information about the process.')),
            ],
        ),
        migrations.CreateModel(
            name='Protocol',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Unique identifier for the protocol.', max_length=200, unique=True)),
            ],
        ),
        migrations.RunPython(
            initialize_protocols,
            migrations.RunPython.noop
        ),
        migrations.CreateModel(
            name='ProcessSample',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('execution_date', models.DateField(default=django.utils.timezone.now, help_text='Date of execution of the process.')),
                ('volume_used', models.DecimalField(blank=True, decimal_places=3, help_text='Volume of the sample used, in µL.', max_digits=20, null=True)),
                ('comment', models.TextField(blank=True, help_text='Relevant information about the process info.')),
                ('process', models.ForeignKey(help_text='Process', on_delete=django.db.models.deletion.PROTECT, related_name='process_sample', to='fms_core.process')),
                ('source_sample', models.ForeignKey(help_text='Source Sample', on_delete=django.db.models.deletion.PROTECT, related_name='process_sample', to='fms_core.sample')),
            ],
        ),
        migrations.AddField(
            model_name='process',
            name='protocol',
            field=models.ForeignKey(help_text='Protocol', on_delete=django.db.models.deletion.PROTECT, related_name='processes', to='fms_core.protocol'),
        ),

        # Change reception_date for creation_date
        migrations.RunPython(
            change_sample_versions_for_creation_date,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RenameField(
            model_name='sample',
            old_name='reception_date',
            new_name='creation_date',
        ),
        migrations.AlterField(
            model_name='sample',
            name='creation_date',
            field=models.DateField(default=django.utils.timezone.now, help_text='Date of the sample reception or extraction.'),
        ),
        migrations.CreateModel(
            name='SampleLineage',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('child', models.ForeignKey(help_text='Child sample', on_delete=django.db.models.deletion.CASCADE,
                                            related_name='child_sample', to='fms_core.sample')),
                ('parent', models.ForeignKey(help_text='Parent sample', on_delete=django.db.models.deletion.CASCADE,
                                             related_name='parent_sample', to='fms_core.sample')),
                ('process_sample', models.ForeignKey(help_text='process used for sample creation',
                                                     on_delete=django.db.models.deletion.PROTECT, to='fms_core.processsample')),
            ],
        ),
        migrations.RenameField(
            model_name='sample',
            old_name='extracted_from',
            new_name='old_extracted_from',
        ),
        migrations.AddField(
            model_name='sample',
            name='child_of',
            field=models.ManyToManyField(blank=True, related_name='parent_of', through='fms_core.SampleLineage',
                                         to='fms_core.Sample'),
        ),
        migrations.RunPython(
            create_lineage_from_extracted_and_revisions,
            migrations.RunPython.noop
        ),
        migrations.RemoveField(
            model_name='sample',
            name='old_extracted_from',
        ),
    ]

    