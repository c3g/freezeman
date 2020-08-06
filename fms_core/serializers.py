from django.contrib.auth.models import User
from rest_framework import serializers
from reversion.models import Version

from .models import Container, Sample, Individual


__all__ = [
    "ContainerSerializer",
    "SimpleContainerSerializer",
    "IndividualSerializer",
    "SampleSerializer",
    "NestedSampleSerializer",
    "VersionSerializer",
    "UserSerializer",
]


class ContainerSerializer(serializers.ModelSerializer):
    children = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    samples = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Container
        fields = "__all__"


class SimpleContainerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Container
        fields = "__all__"


class IndividualSerializer(serializers.ModelSerializer):
    class Meta:
        model = Individual
        fields = "__all__"


class SampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sample
        fields = "__all__"


class NestedSampleSerializer(serializers.ModelSerializer):
    # Serialize foreign keys' objects; don't allow posting new objects (rather accept foreign keys)
    individual = IndividualSerializer(read_only=True)
    container = SimpleContainerSerializer(read_only=True)
    extracted_from = SampleSerializer(read_only=True)

    class Meta:
        model = Sample
        fields = "__all__"


class VersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Version
        fields = "__all__"
        depth = 1


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "groups", "is_staff", "is_superuser", "date_joined")
        depth = 1
