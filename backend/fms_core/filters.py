import django_filters
from fms_core.models import Project, Sample
from fms_core.viewsets._constants import _project_filterset_fields
from fms_core.viewsets._constants import _sample_filterset_fields

class ProjectFilter(django_filters.FilterSet):
    samples = django_filters.Filter(field_name="samples__name", lookup_expr='icontains')

    class Meta:
        model = Project
        fields = {
            **_project_filterset_fields
        }

class SampleFilter(django_filters.FilterSet):
    projects = django_filters.Filter(field_name="projects__name", lookup_expr='icontains')

    class Meta:
        model = Sample
        fields = {
            **_sample_filterset_fields
        }

