# Generated by Django 4.2.4 on 2023-10-04 20:58

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0057_v4_5_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='step',
            name='type',
            field=models.CharField(choices=[('PROTOCOL', 'Protocol'), ('AUTOMATION', 'Automation')], default='PROTOCOL', help_text='Type of step.', max_length=200),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='step',
            name='protocol',
            field=models.ForeignKey(blank=True, help_text='Protocol for the step.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='steps', to='fms_core.protocol'),
        ),
    ]
