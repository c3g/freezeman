from django.db.models import Q

from .models import Container, Sample, Individual

import django_filters

from .viewsets._constants import (
    _container_filterset_fields,
    _sample_filterset_fields,
    _individual_filterset_fields,
    _sample_minimal_filterset_fields,
)

from .viewsets._utils import _prefix_keys

class GenericFilter(django_filters.FilterSet):
    def batch_barcode_filter(self, queryset, name, value):
        query = Q()
        for v in value.split(" "):
            query |= Q(barcode=v)
        return queryset.filter(query)

    def batch_name_filter(self, queryset, name, value):
        query = Q()
        for v in value.split(" "):
            query |= Q(name=v)
        return queryset.filter(query)


class ContainerFilter(GenericFilter):
    barcode = django_filters.CharFilter(field_name="barcode", method="batch_barcode_filter")
    name = django_filters.CharFilter(field_name="name", method="batch_name_filter")

class Meta:
    model = Container
    fields = {
        **_container_filterset_fields,
        **_prefix_keys("location__", _container_filterset_fields),
        **_prefix_keys("samples__", _sample_minimal_filterset_fields),
    }

class SampleFilter(GenericFilter):
    name = django_filters.CharFilter(field_name="name", method="batch_name_filter")

    class Meta:
        model = Sample
        fields = _sample_filterset_fields

class IndividualFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(field_name="name", method="batch_name_filter")

class Meta:
    model = Individual
    fields = _individual_filterset_fields