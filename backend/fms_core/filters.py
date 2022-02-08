from django.db.models import Q

from .models import Container, Individual, Sample, PropertyValue

import django_filters

from .viewsets._constants import (
    _container_filterset_fields,
    _sample_filterset_fields,
    _individual_filterset_fields,
    _sample_minimal_filterset_fields,
)

from .viewsets._utils import _prefix_keys

class GenericFilter(django_filters.FilterSet):
    def batch_filter(self, queryset, name, value):
        query = Q()
        for v in value.split(" "):
            query |= Q(('%s' % name, v))
        query_set = queryset.filter(query)
        return query_set


class ContainerFilter(GenericFilter):
    barcode = django_filters.CharFilter(field_name="barcode", method="batch_filter")
    name = django_filters.CharFilter(field_name="name", method="batch_filter")

    class Meta:
        model = Container
        fields = {
            **_container_filterset_fields,
            **_prefix_keys("location__", _container_filterset_fields),
            **_prefix_keys("samples__", _sample_minimal_filterset_fields),
        }

class SampleFilter(GenericFilter):
    name = django_filters.CharFilter(field_name="name", method="batch_filter")
    container__barcode = django_filters.CharFilter(field_name="container__barcode", method="batch_filter")
    qPCR_status__in = django_filters.CharFilter(method="process_measurement_properties_filter")
    projects__name = django_filters.CharFilter(method="batch_filter")

    def process_measurement_properties_filter(self, queryset, name, value):
        property_values = PropertyValue.objects.filter(property_type__name='qPCR Status')
        condition = Q()
        for status in value.split(','):
            condition |= Q(value__icontains=status)
            process_measurements_ids = property_values.filter(condition).values('object_id')
            return queryset.filter(process_measurement__in=process_measurements_ids)
        else:
            return queryset

    class Meta:
        model = Sample
        fields = _sample_filterset_fields

class IndividualFilter(GenericFilter):
    name = django_filters.CharFilter(field_name="name", method="batch_filter")

    class Meta:
        model = Individual
        fields = _individual_filterset_fields