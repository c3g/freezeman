import re
from fms_core.template_importer._constants import DESTINATION_CONTAINER_BARCODE_MARKER

def get_axiom_experiment_barcode_from_comment(comment: str):
    re_comment = rf"{DESTINATION_CONTAINER_BARCODE_MARKER}(\S+)[ ]\."
    m = re.search(re_comment, comment)
    return m.group(1) # first group holds the experiment container barcode