from collections import Counter
from django.core import serializers
import json

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q, F
from django.core.exceptions import ValidationError

from datetime import datetime
from ..utils import RE_SEPARATOR, float_to_decimal


from fms_core.models import FullSample, Biosample, Sample, DerivedSample,  Container, DerivedBySample
from fms_core.serializers import FullSampleSerializer, FullSampleExportSerializer, SampleSerializer
from fms_core.template_importer.importers import SampleSubmissionImporter, SampleUpdateImporter, SampleQCImporter

from fms_core.template_paths import SAMPLE_SUBMISSION_TEMPLATE, SAMPLE_UPDATE_TEMPLATE, SAMPLE_QC_TEMPLATE

from ._constants import _full_sample_filterset_fields
from ._utils import TemplateActionsMixin, _list_keys

class FullSampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = FullSample.objects.select_related("individual", "container", "sample_kind").all()
    serializer_class = FullSampleSerializer

    ordering_fields = (
        *_list_keys(_full_sample_filterset_fields),
    )