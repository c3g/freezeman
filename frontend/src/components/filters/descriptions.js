import {FILTER_TYPE, SEX, TAXON, PROJECT_STATUS, QPCR_SELECTION_STATUS} from "../../constants";

export const SAMPLE_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "id",
    label: "Sample ID",
  },
  derived_samples__sample_kind__name: {
    type: FILTER_TYPE.SELECT,
    key: "derived_samples__sample_kind__name",
    label: "Type",
    mode: "multiple",
    placeholder: "All"
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
    batch: true,
  },
  derived_samples__biosample__individual__name: {
    type: FILTER_TYPE.INPUT,
    key: "derived_samples__biosample__individual__name",
    label: "Individual Name",
  },
  container__name: {
    type: FILTER_TYPE.INPUT,
    key: "container__name",
    label: "Container Name",
    recursive: true,
  },
  container__barcode: {
    type: FILTER_TYPE.INPUT,
    key: "container__barcode",
    label: "Container Barcode",
    recursive: true,
    batch: true,
  },
  derived_samples__project__name: {
    type: FILTER_TYPE.INPUT,
    key: "derived_samples__project__name",
    label: "Projects",
    batch: true,
  },
  derived_samples__project__id: {
    type: FILTER_TYPE.SELECT,
    key: "derived_samples__project__id",
    label: "Projects ID",
    mode: "multiple",
  },
  coordinates: {
    type: FILTER_TYPE.INPUT,
    key: "coordinates",
    label: "Coordinates",
  },
  volume: {
    type: FILTER_TYPE.RANGE,
    key: "volume",
    label: "Volume",
  },
  concentration: {
    type: FILTER_TYPE.RANGE,
    key: "concentration",
    label: "Concentration",
  },
  creation_date: {
    type: FILTER_TYPE.DATE_RANGE,
    key: "creation_date",
    label: "Creation Date",
  },
  depleted: {
    type: FILTER_TYPE.SELECT,
    key: "depleted",
    label: "Depleted",
    placeholder: "All",
    options: [
      { label: "Yes", value: "true" },
      { label: "No",  value: "false"},
    ],
  },
  qc_flag: {
    type: FILTER_TYPE.SELECT,
    key: "qc_flag",
    label: "QC Flag",
    placeholder: "All",
    mode:"multiple",
    options: [
      { label: "None", value: "None" },
      { label: "Passed", value: "true" },
      { label: "Failed",  value: "false" },
    ],
  },

  // Detached filters
  derived_samples__biosample__individual__pedigree: {
    type: FILTER_TYPE.INPUT,
    key: "derived_samples__biosample__individual__pedigree",
    label: "Individual Pedigree",
    width: 250,
    detached: true,
  },
  derived_samples__biosample__individual__cohort: {
    type: FILTER_TYPE.INPUT,
    key: "derived_samples__biosample__individual__cohort",
    label: "Individual Cohort",
    width: 250,
    detached: true,
  },
  derived_samples__biosample__individual__sex: {
    type: FILTER_TYPE.SELECT,
    key: "derived_samples__biosample__individual__sex",
    label: "Individual Sex",
    mode: "multiple",
    placeholder: "All",
    options: [
      { label: "Female",  value: "F" },
      { label: "Male",    value: "M" },
      { label: "Unknown", value: "Unknown" },
    ],
    detached: true,
  },
  derived_samples__biosample__collection_site: {
    type: FILTER_TYPE.INPUT,
    key: "derived_samples__biosample__collection_site",
    label: "Collection site",
    width: 250,
    detached: true,
  },
  qPCR_status: {
    type: FILTER_TYPE.SELECT,
    key: "qPCR_status",
    label: "qPCR Selection Status",
    placeholder: "All",
    mode: "multiple",
    options: QPCR_SELECTION_STATUS.map(x => ({ label: x, value: x })),
    detached:true,
  },
}

export const CONTAINER_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "id",
    label: "id",
  },
  barcode: {
    type: FILTER_TYPE.INPUT,
    key: "barcode",
    label: "Barcode",
    batch: true,
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
    batch: true,
  },
  kind: {
    type: FILTER_TYPE.SELECT,
    key: "kind",
    label: "Kind",
    mode: "multiple",
    placeholder: "All",
  },
  coordinates: {
    type: FILTER_TYPE.INPUT,
    key: "coordinates",
    label: "Coordinates",
  },
  location: {
    type: FILTER_TYPE.INPUT,
    key: "location__name",
    label: "Location",
    recursive: true,
  },
  samples: {
    type: FILTER_TYPE.INPUT,
    key: "samples__name",
    label: "Sample name",
  }
}

export const INDIVIDUAL_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "id",
    label: "ID",
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
    batch: true,
  },
  taxon__name: {
    type: FILTER_TYPE.SELECT,
    key: "taxon__name",
    label: "Taxon",
    mode: "multiple",
    placeholder: "All",
  },
  sex: {
    type: FILTER_TYPE.SELECT,
    key: "sex",
    label: "Sex",
    mode: "multiple",
    placeholder: "All",
    options: SEX.map(x => ({ label: x, value: x })),
  },
  pedigree: {
    type: FILTER_TYPE.INPUT,
    key: "pedigree",
    label: "Pedigree",
  },
  cohort: {
    type: FILTER_TYPE.INPUT,
    key: "cohort",
    label: "Cohort",
  },
}

export const PROCESS_MEASUREMENT_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "id",
    label: "ID",
  },
  process: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "process",
    label: "Process ID",
  },
  process__protocol__name: {
    type: FILTER_TYPE.SELECT,
    key: "process__protocol__name",
    label: "Protocol",
    mode: "multiple",
    placeholder: "All"
  },
  source_sample__name: {
    type: FILTER_TYPE.INPUT,
    key: "source_sample__name",
    label: "Source Sample",
  },
  lineage__child__name: {
    type: FILTER_TYPE.INPUT,
    key: "lineage__child__name",
    label: "Generated Sample",
  },
  execution_date: {
    type: FILTER_TYPE.DATE_RANGE,
    key: "execution_date",
    label: "Date Processed",
  },
  volume_used: {
    type: FILTER_TYPE.RANGE,
    key: "volume_used",
    label: "Volume Used",
    //exception for Process sample update where volume_used might be negative...
    defaultMin: Number.MIN_SAFE_INTEGER,
  },
}

export const EXPERIMENT_RUN_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "id",
    label: "ID",
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
  },
  run_type: {
    type: FILTER_TYPE.SELECT,
    key: "run_type__name",
    label: "Run Type",
    mode: "multiple",
    placeholder: "All"
  },
  instrument: {
    type: FILTER_TYPE.SELECT,
    key: "instrument__name",
    label: "Instrument",
    mode: "multiple",
    placeholder: "All"
  },
  instrument_type: {
    type: FILTER_TYPE.INPUT,
    key: "instrument__type__type",
    label: "Instrument Type",
    recursive: false,
  },
  container__name: {
    type: FILTER_TYPE.INPUT,
    key: "container__name",
    label: "Container Name",
    recursive: false,
  },
  container__barcode: {
    type: FILTER_TYPE.INPUT,
    key: "container__barcode",
    label: "Container Barcode",
    recursive: false,
  },
  start_date: {
    type: FILTER_TYPE.DATE_RANGE,
    key: "start_date",
    label: "Experiment Start Date",
  },
}

export const USER_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "id",
    label: "User ID"
  },
  username: {
    type: FILTER_TYPE.INPUT,
    key: "username",
    label: "Username"
  },
  email: {
    type: FILTER_TYPE.INPUT,
    key: "email",
    label: "Email"
  },
}

export const PROJECT_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "id",
    label: "Project ID"
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
  },
  principal_investigator: {
    type: FILTER_TYPE.INPUT,
    key: "principal_investigator",
    label: "Principal Investigator",
  },
  status: {
    type: FILTER_TYPE.SELECT,
    key: "status",
    label: "Status",
    mode: "multiple",
    placeholder: "All",
    options: PROJECT_STATUS.map(x => ({ label: x, value: x })),
  },
  requestor_name: {
    type: FILTER_TYPE.INPUT,
    key: "requestor_name",
    label: "Requestor Name",
  },
  targeted_end_date: {
    type: FILTER_TYPE.DATE_RANGE,
    key: "targeted_end_date",
    label: "Targeted End Date",
  },
  project_derived_samples__samples__name: {
    type: FILTER_TYPE.INPUT,
    key: "project_derived_samples__samples__name",
    label: "Samples",
  },
  project_derived_samples__samples__id: {
    type: FILTER_TYPE.SELECT,
    key: "project_derived_samples__samples__id",
    label: "Samples ID",
    mode: "multiple",
  },
}

export const INDEX_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "id",
    label: "ID",
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
    batch: true,
  },
  index_structure__name: {
    type: FILTER_TYPE.INPUT,
    key: "index_structure__name",
    label: "Index Structure",
  },
  index_set__name: {
    type: FILTER_TYPE.INPUT,
    key: "index_set__name",
    label: "Index Structure",
    batch: true,
  },
  sequences_3prime__value: {
    type: FILTER_TYPE.INPUT,
    key: "sequences_3prime__value",
    label: "Sequence 3 prime",
  },
  sequences_5prime__value: {
    type: FILTER_TYPE.INPUT,
    key: "sequences_5prime__value",
    label: "Sequence 5 prime",
  },
}

export const LIBRARY_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_OBJECT_ID,
    key: "id",
    label: "Library ID",
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
    batch: true,
  },
  container__barcode: {
    type: FILTER_TYPE.INPUT,
    key: "container__barcode",
    label: "Container Barcode",
    recursive: true,
    batch: true,
  },
  coordinates: {
    type: FILTER_TYPE.INPUT,
    key: "coordinates",
    label: "Coordinates",
  },
  derived_samples__library__library_type__name: {
    type: FILTER_TYPE.INPUT,
    key: "derived_samples__library__library_type__name",
    label: "Library Type",
  },
  derived_samples__library__index__name: {
    type: FILTER_TYPE.INPUT,
    key: "derived_samples__library__index__name",
    label: "Index",
  },
  derived_samples__library__platform__name: {
    type: FILTER_TYPE.INPUT,
    key: "derived_samples__library__platform__name",
    label: "Platform",
  },
  derived_samples__project__name: {
    type: FILTER_TYPE.INPUT,
    key: "derived_samples__project__name",
    label: "Projects",
    batch: true,
  },
  volume: {
    type: FILTER_TYPE.RANGE,
    key: "volume",
    label: "Volume",
  },
  concentration_ng_ul: {
    type: FILTER_TYPE.RANGE,
    key: "concentration_ng_ul",
    label: "Conc. (ng/ul)",
  },
  concentration_nm: {
    type: FILTER_TYPE.RANGE,
    key: "concentration_nm",
    label: "Conc. (nM)",
  },
  quantity_ng: {
    type: FILTER_TYPE.RANGE,
    key: "quantity_ng",
    label: "Qty (ng)",
  },
  derived_samples__library__library_size: {
    type: FILTER_TYPE.RANGE,
    key: "derived_samples__library__library_size",
    label: "Library Size",
  },
  creation_date: {
    type: FILTER_TYPE.DATE_RANGE,
    key: "creation_date",
    label: "Creation Date",
  },
  depleted: {
    type: FILTER_TYPE.SELECT,
    key: "depleted",
    label: "Depleted",
    placeholder: "All",
    options: [
      { label: "Yes", value: "true" },
      { label: "No",  value: "false"},
    ],
  },
  qc_flag: {
    type: FILTER_TYPE.SELECT,
    key: "qc_flag",
    label: "QC Flag",
    placeholder: "All",
    mode:"multiple",
    options: [
      { label: "None", value: "None" },
      { label: "Passed", value: "true" },
      { label: "Failed",  value: "false" },
    ],
  },
}

export const DATASET_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_NUMBER,
    key: "id",
    label: "Dataset ID",
  },
  run_name: {
    type: FILTER_TYPE.INPUT,
    key: "run_name",
    label: "Run Name",
  },
  external_project_id: {
    type: FILTER_TYPE.INPUT,
    key: "external_project_id",
    label: "Project Name",
  },
  lane: {
    type: FILTER_TYPE.INPUT_NUMBER,
    key: "lane",
    label: "Lane",
  },
}

export const DATASET_FILE_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_NUMBER,
    key: "id",
    label: "Dataset File ID",
  },
  dataset: {
    type: FILTER_TYPE.INPUT_NUMBER,
    key: "dataset",
    label: "Dataset ID",
  },
  file_path: {
    type: FILTER_TYPE.INPUT,
    key: "file_path",
    label: "File Path",
  },
  sample_name: {
    type: FILTER_TYPE.INPUT,
    key: "sample_name",
    label: "Sample Name",
  },
  release_status: {
    type: FILTER_TYPE.SELECT,
    key: "release_status",
    label: "Release Status",
    placeholder: "All",
    options: [
      { label: "Available", value: "0" },
      { label: "Released", value: "1" },
      { label: "Blocked",  value: "2" },
    ],
  },
  release_flag_timestamp: {
    type: FILTER_TYPE.DATE_RANGE,
    key: "release_flag_timestamp",
    label: "Release Time",
  },
}


export const POOLED_SAMPLES_FILTERS = {
    sample__id: {
        // Note: The sample__id filter adds the pool id to the query.
        // It's not mapped to any column, but is required for the pool id to be sent
        // to the endpoint properly.
      type: FILTER_TYPE.INPUT_OBJECT_ID,
      key: "sample__id",
    },
    project_name: {
        type: FILTER_TYPE.INPUT,
        key: "derived_sample__project__name",
        label: "Project Name"
    },
    alias: {
      type: FILTER_TYPE.INPUT,
      key: "derived_sample__biosample__alias",
      label: "Alias"
    },
    volume_ratio: {
      type: FILTER_TYPE.RANGE,
      key: "volume_ratio",
      label: "Volume Ratio"
    },

    library_type: {
      type: FILTER_TYPE.INPUT,
      key: "derived_sample__library__library_type__name",
      label: "Library Type"
    },
    library_size: {
      type: FILTER_TYPE.RANGE,
      key: "derived_sample__library__library_size",
      label: "Library Size",
    },
    index: {
        type: FILTER_TYPE.INPUT,
        key: 'derived_sample__library__index__name',
        label: "Index"
    },
    sample_kind: {
      type: FILTER_TYPE.SELECT,
      key: "derived_sample__sample_kind__name",
      label: "Type",
      mode: "multiple",
      placeholder: "All"
    },
    individual_name: {
      type: FILTER_TYPE.INPUT,
      key: "derived_sample__biosample__individual__name",
      label: "Individual"
    },
    collection_site: {
      type: FILTER_TYPE.INPUT,
      key: "derived_sample__biosample__collection_site",
      label: "Collection Site"
    },
    // TODO: The backend doesn't support filtering on a JSONField yet. Once that is fixed,
    // restore this filter and update the key string to match what is expected.
    // experimental_groups: {
    //   type: FILTER_TYPE.INPUT,
    //   key: "derived_sample__experimental_group",
    //   label: "Experimental Groups"
    // }
}


