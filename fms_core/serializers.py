from rest_framework import serializers
from reversion.models import Version

from .models import Container, Sample, Individual


__all__ = [
    "ContainerSerializer",
    "SampleSerializer",
    "IndividualSerializer",
    "VersionSerializer",
]


class ContainerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Container
        fields = "__all__"


class SampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sample
        fields = "__all__"


class IndividualSerializer(serializers.ModelSerializer):
    class Meta:
        model = Individual
        fields = "__all__"


class VersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Version
        fields = "__all__"
        depth = 1
