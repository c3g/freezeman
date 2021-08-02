from django.db import models
from .sample import Sample
from .protocol import Protocol
from .process import Process
from .process_measurement import ProcessMeasurement


__all__ = ["TransferredSample"]


class TransferredSampleManager(models.Manager):
    def get_queryset(self):
        transfer_protocol = Protocol.objects.get(name='Transfer')
        processes_ids  = Process.objects.filter(protocol_id=transfer_protocol.id).values_list('id', flat=True)
        samples_ids = ProcessMeasurement.objects.filter(id__in=processes_ids).values_list('source_sample_id', flat=True).distinct()
        return Sample.objects.filter(id__in=samples_ids)


class TransferredSample(Sample):
    class Meta:
        proxy = True

    objects = TransferredSampleManager()
