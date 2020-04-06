from rest_framework import viewsets

from .models import Container, Sample, Individual
from .serializers import ContainerSerializer, SampleSerializer, IndividualSerializer


__all__ = ["ContainerViewSet", "SampleViewSet", "IndividualViewSet"]


class ContainerViewSet(viewsets.ModelViewSet):
    queryset = Container.objects.all()
    serializer_class = ContainerSerializer


class SampleViewSet(viewsets.ModelViewSet):
    queryset = Sample.objects.all()
    serializer_class = SampleSerializer


class IndividualViewSet(viewsets.ModelViewSet):
    queryset = Individual.objects.all()
    serializer_class = IndividualSerializer
