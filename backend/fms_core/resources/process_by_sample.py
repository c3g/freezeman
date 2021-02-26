from ._generic import GenericResource
from ..models import ProcessBySample


__all__ = ["ProcessBySampleResource"]


class ProcessBySampleResource(GenericResource):
    class Meta:
        model = ProcessBySample
