from ._generic import GenericResource
from ..models import SampleKind


__all__ = ["SampleKindResource"]


class SampleKindResource(GenericResource):
    class Meta:
        model = SampleKind

