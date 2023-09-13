# Generated by Django 4.2.4 on 2023-09-07 13:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0055_v4_5_0'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='datasetfile',
            name='release_status',
        ),
        migrations.RemoveField(
            model_name='datasetfile',
            name='release_status_timestamp',
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='size',
            field=models.IntegerField(default=1, help_text='Size of the dataset file.'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='readset',
            name='release_status',
            field=models.IntegerField(choices=[(0, 'Available'), (1, 'Released'), (2, 'Blocked')], default=0, help_text='The release status of the file.'),
        ),
        migrations.AddField(
            model_name='readset',
            name='release_status_timestamp',
            field=models.DateTimeField(blank=True, help_text='The last time the release status of the file was changed.', null=True),
        ),
        migrations.RemoveField(
            model_name='datasetfile',
            name='validation_status',
        ),
        migrations.RemoveField(
            model_name='datasetfile',
            name='validation_status_timestamp',
        ),
        migrations.AddField(
            model_name='readset',
            name='validation_status',
            field=models.IntegerField(choices=[(0, 'Available'), (1, 'Passed'), (2, 'Failed')], default=0, help_text='The run validation status of the file.'),
        ),
        migrations.AddField(
            model_name='readset',
            name='validation_status_timestamp',
            field=models.DateTimeField(blank=True, help_text='The last time the run validation status of the file was changed.', null=True),
        ),
    ]
