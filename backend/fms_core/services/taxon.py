from fms_core.models import Individual


def can_edit_taxon(id):
    return not Individual.objects.filter(taxon_id=id).exists()
