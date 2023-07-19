from fms_core.models import Individual

def can_edit_referenceGenome(id):
    """
    When editing a reference genome, we must restrict a user from editing it if and individual
    is referencing it. 
    This returns a boolean if an individual is referencing this taxon. 

    Args:
        id: id of the reference genome
    Returns:
        boolean if individual is associated it.
    """
    return not Individual.objects.filter(reference_genome__id=id).exists()