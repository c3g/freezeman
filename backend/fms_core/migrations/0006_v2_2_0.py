import json

from django.db import migrations, transaction


# noinspection PyPep8Naming,PyUnusedLocal
def fix_volume_history_extracted_sample_ids(apps, schema_editor):
    Sample = apps.get_model("fms_core", "Sample")
    Version = apps.get_model("reversion", "Version")

    # Retrieve all samples with extracted downstream samples
    parent_samples = Sample.objects.filter(extractions__isnull=False).distinct("id").prefetch_related("extractions")

    # Loop through samples and fix their volume histories by examining the
    # creation order of the extractions and the volume updates made.
    with transaction.atomic():
        for sample in parent_samples:
            # Find all extracted samples of this sample and put them in
            # creation date order.

            extraction_creation_dates = []

            for extracted in sample.extractions.all().order_by("id"):
                # Determine the extraction's rough date of creation by getting
                # the date/time of the revision containing the extraction's
                # initial insertion.
                version = Version.objects.filter(
                    object_id=str(extracted.id),
                    content_type__app_label="fms_core",
                    content_type__model="sample",
                ).select_related("revision", "content_type").order_by("revision__date_created").first()

                extraction_creation_dates.append((extracted.id, version.revision.date_created))

            extraction_creation_dates = sorted(extraction_creation_dates, key=lambda x: x[1])

            def fix_volume_history(volume_history):
                """
                Helper method which fixes extracted_sample_id for an instance
                of the volume history array.
                """
                for vh, (e_id, e_creation) in zip(
                        filter(lambda v: v["update_type"] == "extraction", volume_history),
                        extraction_creation_dates):
                    if vh["extracted_sample_id"] != sample.id:  # Already not in previously-bugged state
                        continue

                    vh["extracted_sample_id"] = e_id

            # Using maintained order, flip the IDs if the current record points
            # to the wrong ID (i.e. the ID of the sample on which the extraction was
            # performed.

            fix_volume_history(sample.volume_history)
            sample.save()

            # Update the revisions so that reverting to a previous version
            # doesn't re-break the values.

            for version in Version.objects.filter(object_id=str(sample.id), content_type__app_label="fms_core",
                                                  content_type__model="sample"):
                data = json.loads(version.serialized_data)
                fix_volume_history(data[0]["fields"]["volume_history"])
                version.serialized_data = json.dumps(data)
                version.save()


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0005_v2_0_0'),
        ('reversion', '0001_squashed_0004_auto_20160611_1202'),
    ]

    operations = [
        # Update all samples which were extracted from to point to the correct
        # extracted samples in their volume history records, if relevant.
        migrations.RunPython(fix_volume_history_extracted_sample_ids, reverse_code=migrations.RunPython.noop),
    ]
