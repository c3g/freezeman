from django.db.models import Q
from django.contrib.contenttypes.models import ContentType

from .models import Container, Individual, Sample, PropertyValue, ProcessMeasurement

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
        query_set = queryset.filter(query)
        return query_set


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
    container__barcode = django_filters.CharFilter(field_name="container__barcode", method="batch_container_barcode_filter")
    property_name = django_filters.CharFilter(method="process_measurement_properties_filter")

    def batch_container_barcode_filter(self, queryset, name, value):
        query = Q()
        for v in value.split(" "):
            query |= Q(container__barcode=v)
        query_set = queryset.filter(query)
        return query_set

    def process_measurement_properties_filter(self, queryset, name, value):
        values = self.request.query_params.get('property_value')
        if values:
            property_values = PropertyValue.objects.filter(content_type=ContentType.objects.get_for_model(ProcessMeasurement),
                                                           property_type__name=value)
            condition = Q()
            for value in values.split(','):
                condition |= Q(value__icontains=value)
            process_measurements_ids = property_values.filter(condition).values('object_id')
            return queryset.filter(process_measurement__in=process_measurements_ids)
        else:
            return queryset

    class Meta:
        model = Sample
        fields = _sample_filterset_fields

class IndividualFilter(GenericFilter):
    name = django_filters.CharFilter(field_name="name", method="batch_name_filter")

    class Meta:
        model = Individual
        fields = _individual_filterset_fields