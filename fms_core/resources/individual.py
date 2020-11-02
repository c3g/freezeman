from ._generic import GenericResource
from ..models import Individual


__all__ = ["IndividualResource"]


class IndividualResource(GenericResource):
    class Meta:
        model = Individual
        import_id_fields = ("label",)
