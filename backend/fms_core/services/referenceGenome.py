from fms_core.models import Individual


def can_edit_referenceGenome(id):
    return not Individual.objects.filter(reference_genome__id=id).exists()