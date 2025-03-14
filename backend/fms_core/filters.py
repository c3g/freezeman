from django.db.models import Q, Max, Count, Exists, OuterRef

from django.utils import timezone
import datetime
from .models._constants import ReleaseStatus, ValidationStatus

from .models import (Container,
                     DerivedBySample,
                     Index,
                     Individual,
                     Sample,
                     PropertyValue,
                     Dataset,
                     Biosample,
                     ExperimentRun,
                     Readset,
                     SampleNextStep,
                     SampleNextStepByStudy,
                     StepHistory)

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
    _sample_next_step_by_study_filterset_fields,
    _readset_filterset_fields,
    _stephistory_filterset_fields,
    _experiment_run_filterset_fields,
)

from .viewsets._utils import _prefix_keys

class GenericFilter(django_filters.FilterSet):
    id__not__in = django_filters.NumberFilter(method="id_not_in_filter")

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

    def id_not_in_filter(self, queryset, name, value):
        ids = value.split(',')
        return queryset.exclude(id__in=ids)

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
    derived_by_samples__project__name = django_filters.CharFilter(method="insensitive_batch_filter")
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
    derived_by_samples__project__name = django_filters.CharFilter(method="insensitive_batch_filter")
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
    index_sets__name = django_filters.CharFilter(field_name="index_sets__name", method="batch_filter")
    name = django_filters.CharFilter(field_name="name", method="batch_filter")

    class Meta:
        model = Index
        fields = _index_filterset_fields

class DatasetFilter(GenericFilter):
    release_flag = django_filters.NumberFilter(method="release_flag_filter")
    latest_release_update = django_filters.CharFilter(method="latest_release_update_filter")
    latest_release_update__gte = django_filters.CharFilter(method="latest_release_update__gte_filter")
    latest_release_update__lt = django_filters.CharFilter(method="latest_release_update__lt_filter")
    latest_validation_update = django_filters.CharFilter(method="latest_validation_update_filter")
    latest_validation_update__gte = django_filters.CharFilter(method="latest_validation_update__gte_filter")
    latest_validation_update__lt = django_filters.CharFilter(method="latest_validation_update__lt_filter")

    def release_flag_filter(self, queryset, name, value):
        return queryset.filter(release_flag=value)

    def latest_release_update_filter(self, queryset, name, value):
        return queryset.annotate(
            latest_release_update=Max("readsets__release_status_timestamp")
        ).filter(latest_release_update__gt=value)

    def latest_release_update__gte_filter(self, queryset, name, value):
        return queryset.annotate(
            latest_release_update=Max("readsets__release_status_timestamp")
        ).filter(latest_release_update__gte=value)

    def latest_release_update__lt_filter(self, queryset, name, value):
        return queryset.annotate(
            latest_release_update=Max("readsets__release_status_timestamp")
        ).filter(latest_release_update__lt=value)

    def latest_validation_update_filter(self, queryset, name, value):
        return queryset.annotate(
            latest_validation_update=Max("readsets__validation_status_timestamp")
        ).filter(latest_validation_update__gt=value)

    def latest_validation_update__gte_filter(self, queryset, name, value):
        return queryset.annotate(
            latest_validation_update=Max("readsets__validation_status_timestamp")
        ).filter(latest_validation_update__gte=value)

    def latest_validation_update__lt_filter(self, queryset, name, value):
        return queryset.annotate(
            latest_validation_update=Max("readsets__validation_status_timestamp")
        ).filter(latest_validation_update__lt=value)

    class Meta:
        model = Dataset
        fields = _dataset_filterset_fields

class ExperimentRunFilter(GenericFilter):
    experiment_run_progress_stage = django_filters.CharFilter(method="experiment_run_progress_stage_filter")

    def experiment_run_progress_stage_filter(self, queryset, name, value):
        queryset = queryset.annotate(
            has_readsets=Exists(Readset.objects.filter(dataset__experiment_run=OuterRef("pk")))
        )
        queryset = queryset.annotate(
            unvalidated_count=Count("datasets__readsets", filter=Q(datasets__readsets__validation_status=ValidationStatus.AVAILABLE), distinct=True)
        )
        queryset = queryset.annotate(
            unreleased_count=Count("datasets__readsets", filter=Q(datasets__readsets__release_status=ReleaseStatus.AVAILABLE), distinct=True)
        )

        match value:
            case "processed":
                filtered_queryset = queryset.filter(unvalidated_count__gt=0)
            case "validated":
                filtered_queryset = queryset.filter(unvalidated_count=0, unreleased_count__gt=0)
            case "released":
                filtered_queryset = queryset.filter(unvalidated_count=0, unreleased_count=0, has_readsets=True)

        return filtered_queryset
    class Meta:
        model = ExperimentRun
        fields = _experiment_run_filterset_fields

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
    sample__container__barcode = django_filters.CharFilter(field_name="sample__container__barcode", method="batch_filter")
    sample__container__location__barcode = django_filters.CharFilter(field_name="sample__container__location__barcode", method="batch_filter")

    qc_flag__in = django_filters.CharFilter(method="qc_flag_filter")
    quantity_ng__lte = django_filters.NumberFilter(method="quantity_ng_lte_filter")
    quantity_ng__gte = django_filters.NumberFilter(method="quantity_ng_gte_filter")
    ordering_container_name__icontains = django_filters.CharFilter(method="ordering_container_name_icontains_filter")
    ordering_container_name = django_filters.CharFilter(method="ordering_container_name_exact_filter")

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

    def ordering_container_name_icontains_filter(self, queryset, name, value):
        condition = Q(ordering_container_name__icontains=value)
        return queryset.filter(condition)

    def ordering_container_name_exact_filter(self, queryset, name, value):
        condition = Q(ordering_container_name__exact=value)
        return queryset.filter(condition)

    class Meta:
        model = SampleNextStep
        fields = _sample_next_step_filterset_fields

class SampleNextStepByStudyFilter(GenericFilter):
    qc_flag__in = django_filters.CharFilter(method="qc_flag_filter")

    def qc_flag_filter(self, queryset, name, values):
        condition = Q()
        for value in values.split(','):
            if value == "None":
                bool_value = None
            else:
                bool_value = (value == 'true')
            condition |= Q(qc_flag=bool_value)
        return queryset.filter(condition)

    class Meta:
        model = SampleNextStepByStudy
        fields = _sample_next_step_by_study_filterset_fields

class ReadsetFilter(GenericFilter):
    number_reads__lte = django_filters.NumberFilter(method="number_reads_lte_filter")
    number_reads__gte = django_filters.NumberFilter(method="number_reads_gte_filter")

    def number_reads_lte_filter(self, queryset, name, value):
        condition = Q(number_reads__lte=value)
        return queryset.filter(condition)

    def number_reads_gte_filter(self, queryset, name, value):
        condition = Q(number_reads__gte=value)
        return queryset.filter(condition)

    class Meta:
        model = Readset
        fields = _readset_filterset_fields

class StepHistoryFilter(GenericFilter):
    workflow_action = django_filters.CharFilter(field_name="workflow_action", method="batch_filter")

    class Meta:
        model = StepHistory
        fields = _stephistory_filterset_fields