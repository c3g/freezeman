from fms_core.models import Individual

# returns a boolean if an individual is referencing this reference genome
def can_edit_referenceGenome(id):
    return not Individual.objects.filter(reference_genome__id=id).exists()