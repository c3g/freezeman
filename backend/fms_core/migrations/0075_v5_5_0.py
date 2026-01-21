from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0074_v5_3_1'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='sampleidentitymatch',
            name='sampleidentitymatch_testedid_matchedid_key',
        ),
        migrations.AddField(
            model_name='sampleidentitymatch',
            name='readset',
            field=models.ForeignKey(blank=True, help_text='Match found by comparing sequencing data to identity signature.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='readset_identity_match', to='fms_core.readset'),
        ),
        migrations.AddConstraint(
            model_name='sampleidentitymatch',
            constraint=models.UniqueConstraint(fields=('tested_id', 'matched_id', 'readset_id'), name='sampleidentitymatch_testedid_matchedid_readsetid_key'),
        ),
    ]
