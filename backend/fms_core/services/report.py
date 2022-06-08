from datetime import datetime
from typing import Any, List
from django.db.models import Count, F, Q, QuerySet
from fms_core.models import SampleByProject

def samples_by_project(project, start_date: datetime, end_date: datetime):
    return SampleByProject.objects.filter(project=project) \
                                  .annotate(creation_date=F("sample__creation_date")) \
                                  .filter(creation_date__gte=start_date, creation_date__lte=end_date)

