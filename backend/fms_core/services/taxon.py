from fms_core.models import Individual

# returns a boolean if an individual is referencing this taxon
def can_edit_taxon(id):
    return not Individual.objects.filter(taxon_id=id).exists()
