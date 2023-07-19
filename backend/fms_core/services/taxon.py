from fms_core.models import Individual


def can_edit_taxon(id):
    """
    When editing a taxon, we must restrict a user from editing it if and individual
    is referencing it. 
    This returns a boolean if an individual is referencing this taxon. 

    Args:
        id: id of the taxon
    Returns:
        boolean if individual is associated it.
    """
    return not Individual.objects.filter(taxon_id=id).exists()
