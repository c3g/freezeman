__all__ = [
    "create_experiment_run",
]



def create_sample(barcode, name, kind, alias, experiment_group, reception_date, comment,
                  volume, concentration, collection_site, tissue_source, phenotype,
                  individual,
                  container):
    pass


def create_container(barcode, name, kind, location_container, location_coordinates):
    pass


def move_container(container, destination_container, coordinates, comment):
    pass


def rename_container(container, new_barcode, new_name, comment):
    pass


# Process related Templates

def transfer_sample(sample, original_container, destination_container, process_measurement):
    pass


def extract_sample(sample, original_container, destination_container, process_measurement, extraction):
    pass


def update_sample(sample, container, process_measurement):
    pass



# Used in ExperimentRun
def create_experiment_run(experiment_type, instrument, container, start_date, samples, properties):
    import ipdb; ipdb.sset_trace();

    pass



