from django.db.models import Count, Min, Max, OuterRef, Subquery, Sum
from fms_core.models import DerivedBySample, Sample, Readset, Metric,ProcessMeasurement,SampleLineage
from rest_framework import viewsets

from ._constants import _sample_reporting_filterset_fields
from fms_core.serializers import SampleReportingSerializer
from django.contrib.postgres.expressions import ArraySubquery

from rest_framework.response import Response

class SampleReportingViewSet(viewsets.ModelViewSet):
    serializer_class = SampleReportingSerializer

    filterset_fields = {
        **_sample_reporting_filterset_fields
    }

    # Collect the root sample and its descendants associated with the same biosample.
    def get_sample_chain_ids(self, root_sample_id, biosample_id):
        visited = {root_sample_id}
        current_level = {root_sample_id}

        while current_level:
            children = set(
                SampleLineage.objects
                .filter(
                    parent_id__in=current_level,
                    child__derived_samples__biosample_id=biosample_id,
                )
                .values_list("child_id", flat=True)
                .distinct()
            )

            current_level = children - visited
            visited.update(current_level)

        return visited

    # Return the earliest extraction date in the sample chain, or None if absent.
    def get_first_extraction_date(self, root_sample_id, biosample_id):
        sample_ids = self.get_sample_chain_ids(
            root_sample_id,
            biosample_id,
        )

        result = (
            ProcessMeasurement.objects
            .filter(
                source_sample_id__in=sample_ids,
                process__protocol__name="Extraction",
            )
            .aggregate(first_date=Min("execution_date"))
        )

        return result["first_date"]

    # Collect each root sample's descendants for the same biosample, querying all chains together.
    def get_sample_chains(self, rows):
        chains = {
            (row.sample_id, row.derived_sample.biosample_id): {row.sample_id}
            for row in rows
        }
        current_levels = {
            key: set(sample_ids)
            for key, sample_ids in chains.items()
        }

        while current_levels:
            parent_ids = {
                sample_id
                for sample_ids in current_levels.values()
                for sample_id in sample_ids
            }

            edges = (
                SampleLineage.objects
                .filter(
                    parent_id__in=parent_ids,
                    child__derived_samples__biosample_id__in={
                        biosample_id
                        for _, biosample_id in current_levels
                    },
                )
                .values_list(
                    "parent_id",
                    "child_id",
                    "child__derived_samples__biosample_id",
                )
                .distinct()
            )

            children_by_parent = {}
            for parent_id, child_id, biosample_id in edges:
                children_by_parent.setdefault(
                    (parent_id, biosample_id), set()
                ).add(child_id)

            next_levels = {}
            for key, sample_ids in current_levels.items():
                children = set()
                for sample_id in sample_ids:
                    children.update(
                        children_by_parent.get((sample_id, key[1]), set())
                    )

                new_children = children - chains[key]
                if new_children:
                    chains[key].update(new_children)
                    next_levels[key] = new_children

            current_levels = next_levels

        return chains


    # Find the earliest extraction date for each chain using one grouped query.
    def get_first_extraction_dates(self, rows):
        chains = self.get_sample_chains(rows)

        all_sample_ids = {
            sample_id
            for chain_ids in chains.values()
            for sample_id in chain_ids
        }

        dates_by_sample = dict(
            ProcessMeasurement.objects
            .filter(
                source_sample_id__in=all_sample_ids,
                process__protocol__name="Extraction",
            )
            .order_by()
            .values("source_sample_id")
            .annotate(first_date=Min("execution_date"))
            .values_list("source_sample_id", "first_date")
        )

        dates_by_chain = {}
        for key, chain_ids in chains.items():
            dates = [
                dates_by_sample[sample_id]
                for sample_id in chain_ids
                if sample_id in dates_by_sample
            ]
            dates_by_chain[key] = min(dates) if dates else None

        return dates_by_chain
    

    def get_queryset(self):

        root_samples = (
            Sample.objects
            .filter(child_of__isnull=True)
            .annotate(
                derived_sample_count=Count("derived_samples", distinct=True)
            )
            .filter(derived_sample_count=1)
        )

        reads_by_biosample = (
            Readset.objects
            .filter(
                derived_sample__biosample_id=OuterRef(
                    "derived_sample__biosample_id"
                )
            )
            .annotate(
                nb_reads=Subquery(
                    Metric.objects
                    .filter(readset=OuterRef("pk"), name="nb_reads")
                    .order_by("pk")
                    .values("value_numeric")[:1]
                )
            )
            .order_by()
            .values("derived_sample__biosample_id")
            .annotate(total_reads=Sum("nb_reads"))
            .values("total_reads")[:1]
        )

        latest_date_for_sample = (
        ProcessMeasurement.objects
        .filter(source_sample_id=OuterRef("source_sample_id"))
        .order_by("-execution_date")
        .values("execution_date")[:1]
        )

        last_processes = (
            ProcessMeasurement.objects
            .filter(
                source_sample_id=OuterRef("sample_id"),
                execution_date=Subquery(latest_date_for_sample),
            )
            .order_by("process_id")
            .values("process_id")
            .distinct()
        )

        return DerivedBySample.objects.filter(
            sample__in=root_samples,
            volume_ratio=1,
        ).annotate(
            number_of_reads=Subquery(reads_by_biosample),
            last_process_execution_date=Max("sample__process_measurement__execution_date"),
            last_process_ids=ArraySubquery(last_processes),
            last_process_names=ArraySubquery(last_processes.values("process__protocol__name").distinct("process_id")),
        )
    

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(
            self.get_queryset()
        ).prefetch_related(
            "sample__container",
            "derived_sample__biosample__individual__taxon",
            "project__parent_project",
        )

        page = self.paginate_queryset(queryset)
        rows = list(page) if page is not None else list(queryset)

        extraction_dates = self.get_first_extraction_dates(rows)

        for row in rows:
            key = (row.sample_id, row.derived_sample.biosample_id)
            row.extraction_date = extraction_dates[key]

        serializer = self.get_serializer(rows, many=True)

        if page is not None:
            return self.get_paginated_response(serializer.data)

        return Response(serializer.data)