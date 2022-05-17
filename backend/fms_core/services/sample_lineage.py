from django.db.models import F
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

    nodes = [mid_sample]
    edges = []

    if not errors:
        def add_lineage(process_measurements):
            queryset = process_measurements.select_related("process").prefetch_related("lineage")
            queryset = queryset.annotate(child_sample=F("lineage__child"))
            queryset = queryset.annotate(child_sample_name=F("lineage__child__name"))
            queryset = queryset.annotate(source_sample_name=F("source_sample__name"))
            return queryset

        def query_set_iterator(f, l):
            for x in l:
                try:
                    yield f(x)
                except ObjectDoesNotExist:
                    yield None

        # fetch children
        stack = [mid_sample]
        visited = {mid_sample.id}
        while stack:
            child_sample = stack.pop()
            new_process_measurements = [
                p
                for p in add_lineage(child_sample.process_measurement.all())
            ]

            sample_lineages = [
                sl
                for sl in query_set_iterator(lambda p: p.lineage.get(), new_process_measurements)
            ]

            new_child_samples = [
                sl.child
                for sl in sample_lineages
                if sl and sl.child.id not in visited
            ]

            nodes.extend(new_child_samples)
            edges.extend(new_process_measurements)

            stack.extend(new_child_samples)
            visited.update(s.id for s in new_child_samples)
        
        def find_process_measurement(parent_sample, child_sample):
            process_measurements = list(add_lineage(parent_sample.process_measurement.all()))
            for p in process_measurements:
                if p.child_sample == child_sample.id:
                    return p

        # fetch parents
        stack = [mid_sample]
        while stack:
            child_sample = stack.pop()
            
            new_parent_samples = [
                s for s in child_sample.child_of.all() if s.id not in visited
            ]

            new_process_measurements = [
                find_process_measurement(s, child_sample) for s in new_parent_samples
            ]

            nodes.extend(new_parent_samples)
            edges.extend(new_process_measurements)

            stack.extend(new_parent_samples)
            visited.update(s.id for s in new_parent_samples)

    
    return (nodes, edges, errors)