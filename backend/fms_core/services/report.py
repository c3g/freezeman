from datetime import datetime
from typing import Any, Iterable, List, Optional
from django.db.models import Count, F, Q, QuerySet
from fms_core.models import Project, Sample, SampleByProject, Biosample, DerivedSample,ProcessMeasurement

def samples_by_project(project: Project, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> QuerySet[SampleByProject]:
    sbps = SampleByProject.objects.filter(project=project)

    end_date = datetime.now() if end_date is None else end_date
    sbps = sbps.filter(sample__creation_date__lte=end_date)

    if start_date:
        sbps = sbps.filter(sample__creation_date__gte=start_date)

    return sbps

def sample_by_project__sample(samples_by_project: QuerySet[SampleByProject]) -> QuerySet[Sample]:
    s_ids = samples_by_project.values_list("sample", flat=True)
    ss = Sample.objects.filter(id__in=s_ids)
    return ss

def sample__derived_samples(samples: QuerySet[Sample]) -> QuerySet[DerivedSample]:
    ds_ids = samples.values_list("derived_samples", flat=True)
    dss = DerivedSample.objects.filter(id__in=ds_ids)
    return dss

def derived_sample__biosample__count(derived_samples: QuerySet[DerivedSample]) -> int:
    return derived_samples.values_list("biosample", flat=True).distinct().count()

def process_measurements(samples: QuerySet[Sample], start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> QuerySet[ProcessMeasurement]:
    pms = ProcessMeasurement.objects.filter(source_sample__in=samples)

    end_date = datetime.now() if end_date is None else end_date
    pms = pms.filter(execution_date__lte=end_date)

    if start_date:
        pms = pms.filter(execution_date_gte=start_date)

    return pms

def process_measurement__process__protocol__name__icontains(process_measurements: QuerySet[ProcessMeasurement], pattern: str) -> QuerySet[ProcessMeasurement]:
    return process_measurements.filter(process__protocol__name__icontains=pattern)

def process_measurement_lineage__child__derived_samples__sample_kind__name(process_measurements: QuerySet[ProcessMeasurement]) -> Iterable[str]:
    return process_measurements.annotate(dcount=Count("lineage__child__derived_samples")) \
                               .filter(dcount__lte=1) \
                               .values_list("lineage__child__derived_samples__sample_kind__name", flat=True)
