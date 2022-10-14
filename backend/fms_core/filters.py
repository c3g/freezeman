from django.db.models import Q

from .models import Container, DerivedBySample, Index, Individual, Sample, PropertyValue, Dataset

import django_filters

from .viewsets._constants import (
    _container_filterset_fields,
    _sample_filterset_fields,
    _individual_filterset_fields,
    _sample_minimal_filterset_fields,
    _index_filterset_fields,
    _library_filterset_fields,
    _dataset_filterset_fields,
    _pooled_sample_filterset_fields,
)

from .viewsets._utils import _prefix_keys

class GenericFilter(django_filters.FilterSet):
    def batch_filter(self, queryset, name, value):
        query = Q()
        for v in value.split(" "):
            query |= Q(('%s' % name, v))
        query_set = queryset.filter(query)
        return query_set

    def insensitive_batch_filter(self, queryset, name, value):
        query = Q()
        for v in value.split(" "):
            query |= Q((f"{name}__iexact", v))
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
    derived_samples__project__name = django_filters.CharFilter(method="insensitive_batch_filter")
    qc_flag__in = django_filters.CharFilter(method="qc_flag_filter")
    is_pooled = django_filters.CharFilter(method="is_pooled_filter")

    def process_measurement_properties_filter(self, queryset, name, value):
        property_values = PropertyValue.objects.filter(property_type__name='qPCR Status')
        condition = Q()
        for status in value.split(','):
            condition |= Q(value__icontains=status)
        process_measurements_ids = property_values.filter(condition).values('object_id')
        return queryset.filter(process_measurement__in=process_measurements_ids)

    def qc_flag_filter(self, queryset, name, values):
        condition = Q()
        for value in values.split(','):
            if value == "None":
                bool_value = None
            else:
                bool_value = (value == 'true')
            condition |= Q(qc_flag=bool_value)
        return queryset.filter(condition)

    def is_pooled_filter(self, queryset, name, values):
        bool_value = (values == 'true')
        return queryset.filter(is_pooled=bool_value)

    class Meta:
        model = Sample
        fields = _sample_filterset_fields

class LibraryFilter(GenericFilter):
    name = django_filters.CharFilter(field_name="name", method="batch_filter")
    container__barcode = django_filters.CharFilter(field_name="container__barcode", method="batch_filter")
    derived_samples__project__name = django_filters.CharFilter(method="insensitive_batch_filter")
    qc_flag__in = django_filters.CharFilter(method="qc_flag_filter")
    quantity_ng__lte = django_filters.NumberFilter(method="quantity_ng_lte_filter")
    quantity_ng__gte = django_filters.NumberFilter(method="quantity_ng_gte_filter")
    is_pooled = django_filters.CharFilter(method="is_pooled_filter")

    def qc_flag_filter(self, queryset, name, values):
        condition = Q()
        for value in values.split(','):
            if value == "None":
                bool_value = None
            else:
                bool_value = (value == 'true')
            condition |= Q(qc_flag=bool_value)
        return queryset.filter(condition)

    def quantity_ng_lte_filter(self, queryset, name, value):
        condition = Q(quantity_ng__lte=value)
        return queryset.filter(condition)
    
    def quantity_ng_gte_filter(self, queryset, name, value):
        condition = Q(quantity_ng__gte=value)
        return queryset.filter(condition)

    def is_pooled_filter(self, queryset, name, values):
        bool_value = (values == 'true')
        return queryset.filter(is_pooled=bool_value)

    class Meta:
        model = Sample
        fields = _library_filterset_fields

class IndividualFilter(GenericFilter):
    name = django_filters.CharFilter(field_name="name", method="batch_filter")

    class Meta:
        model = Individual
        fields = _individual_filterset_fields

class IndexFilter(GenericFilter):
    index_set__name = django_filters.CharFilter(field_name="index_set__name", method="batch_filter")
    name = django_filters.CharFilter(field_name="name", method="batch_filter")

    class Meta:
        model = Index
        fields = _index_filterset_fields

class DatasetFilter(GenericFilter):
    release_flag = django_filters.NumberFilter(method="release_flag_filter")

    def release_flag_filter(self, queryset, name, value):
        return queryset.filter(release_flag=value)

    class Meta:
        model = Dataset
        fields = _dataset_filterset_fields

