from django.db.models import Q

from fms_core.models.sample_next_step import SampleNextStep

from .models import Container, DerivedBySample, Index, Individual, Sample, PropertyValue, Dataset, Biosample

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
    _sample_next_step_filterset_fields,
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
    metadata = django_filters.CharFilter(method="metadata_filter")

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

    def metadata_filter(self, queryset, name, values):
        # Build dictionary of form {name1: [value1, value2], name2: [value1] }
        metadata_dict = {}
        for metadatum in values.split(','):
            if metadatum:
                # Use the string after the first '__' as the value (even if it contains '__')
                name_value = metadatum.split('__', 1)
                # Check that there's at least 1 '__' that separates name and value
                if name_value and len(name_value) > 1:
                    # Just the metadata name is given, no value
                    if name_value[0] and not name_value[1]:
                        metadata_dict[name_value[0]] = []
                    # Metadata name exists in the dict (and it is not []), append value
                    elif name_value[0] in metadata_dict.keys() and metadata_dict[name_value[0]]:
                        metadata_dict[name_value[0]].append(name_value[1])
                    # Metadata name is not in the dict, add first value
                    elif name_value[0] not in metadata_dict.keys():
                        metadata_dict[name_value[0]] = [name_value[1]]
        # Build queryset
        biosample_qs = Biosample.objects.all()
        for metadata_name, metadata_values in metadata_dict.items():
            # Meaning value was left empty
            if not metadata_values:
                biosample_qs = biosample_qs.filter(metadata__name=metadata_name)
            else:
                biosample_qs = biosample_qs.filter(metadata__name=metadata_name, metadata__value__in=metadata_values)
        # Apply filter to sample queryset
        biosample_ids = biosample_qs.values('id')
        return queryset.filter(derived_samples__biosample__in=biosample_ids)

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

class PooledSamplesFilter(GenericFilter):
    parent_sample_name__icontains = django_filters.CharFilter(method="parent_sample_name_filter")
    parent_sample_name__startswith = django_filters.CharFilter(method="parent_sample_name_exact_filter")

    def parent_sample_name_filter(self, queryset, name, value):
        return queryset.filter(parent_sample_name__icontains=value)

    def parent_sample_name_exact_filter(self, queryset, name, value):
        return queryset.filter(parent_sample_name__startswith=value)

    class Meta:
        model = DerivedBySample
        fields = _pooled_sample_filterset_fields

class SampleNextStepFilter(GenericFilter):

    qc_flag__in = django_filters.CharFilter(method="qc_flag_filter")
    quantity_ng__lte = django_filters.NumberFilter(method="quantity_ng_lte_filter")
    quantity_ng__gte = django_filters.NumberFilter(method="quantity_ng_gte_filter")

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

    class Meta:
        model = SampleNextStep
        fields = _sample_next_step_filterset_fields