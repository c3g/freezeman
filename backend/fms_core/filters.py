from django.db.models import Q

from .models import Container, Sample, Individual

import django_filters

from .viewsets._constants import (
    _container_filterset_fields,
    _sample_filterset_fields,
    _individual_filterset_fields,
)

class ContainerBatchFilter(django_filters.FilterSet):
    barcode = django_filters.CharFilter(field_name="barcode", method="batch_barcode_filter")
    name = django_filters.CharFilter(field_name="name", method="batch_name_filter")

    class Meta:
        model = Container
        fields = _container_filterset_fields

    def batch_barcode_filter(self, queryset, name, value):
        query = Q()
        for barcode in value.split(" "):
            query |= Q(barcode__contains=barcode)
        return queryset.filter(query)

    def batch_name_filter(self, queryset, name, value):
        query = Q()
        for name in value.split(" "):
            query |= Q(name__contains=name)
        return queryset.filter(query)

class SampleBatchFilter(django_filters.FilterSet):
    barcode = django_filters.CharFilter(field_name="barcode", method="batch_name_filter")
    name = django_filters.CharFilter(field_name="name", method="batch_name_filter")

    class Meta:
        model = Sample
        fields = _sample_filterset_fields

    def batch_name_filter(self, queryset, name, value):
        query = Q()
        for name in value.split(" "):
            query |= Q(name__contains=name)
        return queryset.filter(query)

class IndividualBatchFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(field_name="name", method="batch_name_filter")

    class Meta:
        model = Individual
        fields = _individual_filterset_fields

    def batch_name_filter(self, queryset, name, value):
        query = Q()
        for name in value.split(" "):
            query |= Q(name__contains=name)
        return queryset.filter(query)