from django.db.models import Q, F
from django.contrib.auth.models import User
from django.db.models.functions import Greatest

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import Container, Individual, Sample
from fms_core.serializers import ContainerSerializer, IndividualSerializer, SampleSerializer, UserSerializer

from ._utils import FZY


# noinspection PyMethodMayBeStatic,PyUnusedLocal
class QueryViewSet(viewsets.ViewSet):
    basename = "query"

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.GET.get("q")

        if not query:
            return Response([])

        def serialize(s) -> dict:
            item_type = s["type"]
            s["score"] = s["item"].score
            if item_type == Container:
                s["type"] = "container"
                s["item"] = ContainerSerializer(s["item"]).data
                return s
            if item_type == Sample:
                s["type"] = "sample"
                s["item"] = SampleSerializer(s["item"]).data
                return s
            if item_type == Individual:
                s["type"] = "individual"
                s["item"] = IndividualSerializer(s["item"]).data
                return s
            if item_type == User:
                s["type"] = "user"
                s["item"] = UserSerializer(s["item"]).data
                return s
            raise ValueError("unreachable")

        def query_and_score(model, fields):
            scores = list(map(lambda f: FZY(F(f), query), fields))
            scores = scores[0] if len(scores) == 1 else Greatest(*scores)
            return [{
                "type": model,
                "item": s
            } for s in model.objects
                .annotate(
                    score=scores
                )
                .filter(score__gt=0)
                .order_by('-score')[:100]
            ]

        containers = query_and_score(Container, ["name"])
        individuals = query_and_score(Individual, ["name"])
        samples = query_and_score(Sample, ["name"])
        users = query_and_score(User, ["username", "first_name", "last_name"])

        results = containers + individuals + samples + users
        results.sort(key=lambda c: c["item"].score, reverse=True)
        data = map(serialize, results[:100])

        return Response(data)
