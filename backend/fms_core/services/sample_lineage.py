from django.db.models import F, Q, Count
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from fms_core.models import SampleLineage, Sample, ProcessMeasurement


def create_sample_lineage(parent_sample, child_sample, process_measurement):
    sample_lineage = None
    errors = []
    warnings = []

     # Validate parameters
    if not parent_sample:
        errors.append(f"Parent sample is required for sample lineage creation.")
    if not child_sample:
        errors.append(f"Child sample is required for sample lineage creation.")
    if not process_measurement:
        errors.append(f"Process measurement is required for sample lineage creation.")

    if not errors:
        try:
            sample_lineage = SampleLineage.objects.create(child=child_sample,
                                                          parent=parent_sample,
                                                          process_measurement=process_measurement
                                                          )
        except ValidationError as e:
            errors.append(str(e))

    return (sample_lineage, errors, warnings)

def create_sample_lineage_graph(mid_sample):
    errors = []

    if not mid_sample:
        errors.append(f"Sample is required for sample lineage graph creation")

    if not errors:
        def annotate_process_measurements(process_measurements):
            queryset = process_measurements.prefetch_related("process").prefetch_related("lineage")
            queryset = queryset.annotate(child_sample=F("lineage__child"))
            return queryset
        
        def annotate_samples(samples):
            queryset = samples.select_related("process_measurement").prefetch_related("process_measurement__lineage")
            queryset = queryset.annotate(
                child_count=Count(
                    'process_measurement',
                    filter=~Q(process_measurement__lineage__child=None)
                )
            )
            return queryset


        total_new_samples = [Sample.objects.filter(pk=mid_sample.id)]
        total_new_process_measurements = []

        # fetch children
        stack = [mid_sample.id]
        visited = {mid_sample.id}
        while stack:
            parent_sample_id = stack.pop()

            new_process_measurements = annotate_process_measurements(
                ProcessMeasurement.objects.filter(source_sample=parent_sample_id)
            ).filter(
                ~Q(child_sample=None)
            )
            
            new_child_samples_id = [
                p.child_sample for p in new_process_measurements.filter(~Q(child_sample=None)).exclude(id__in=visited)
            ]
            new_child_samples = Sample.objects.filter(id__in=new_child_samples_id)

            total_new_samples.append(new_child_samples)
            total_new_process_measurements.append(new_process_measurements)

            stack.extend(s.id for s in new_child_samples)
            visited.update(p.id for p in new_process_measurements)

        # fetch parents
        stack = [mid_sample.id]
        while stack:
            child_sample_id = stack.pop()
            child_sample = Sample.objects.filter(id=child_sample_id)

            child_of = child_sample.values('child_of').get()['child_of']
            # child_of is either a None, a single int, or a list of int
            try:
                list(child_of)
            except TypeError:
                child_of = [child_of]

            new_parent_samples = Sample.objects.filter(id__in=child_of).exclude(id__in=visited)
            new_process_measurements = annotate_process_measurements(
                ProcessMeasurement.objects.all()
            ).filter(
                child_sample=child_sample_id
            )

            total_new_samples.append(new_parent_samples)
            total_new_process_measurements.append(new_process_measurements)

            stack.extend(s.id for s in new_parent_samples)
            visited.update(p.id for p in new_process_measurements)


        nodes = [
            s
            for queryset in total_new_samples
            for s in annotate_samples(queryset).values(
                'id',
                'name',
                'quality_flag',
                'quantity_flag',
                'child_count'
            )
        ]

        edges = [
            p
            for queryset in total_new_process_measurements
            for p in queryset.values(
                'id',
                'source_sample',
                'child_sample',
                'process__protocol__name',
            )
        ]

    
    return (nodes, edges, errors)