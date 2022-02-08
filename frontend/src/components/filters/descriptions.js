import {FILTER_TYPE, SEX, TAXON, PROJECT_STATUS, QPCR_SELECTION_STATUS} from "../../constants";

export const SAMPLE_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_NUMBER,
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
  projects__name: {
    type: FILTER_TYPE.INPUT,
    key: "projects__name",
    label: "Projects",
    batch: true,
  },
  projects__id: {
    type: FILTER_TYPE.SELECT,
    key: "projects__id",
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
    type: FILTER_TYPE.INPUT_NUMBER,
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
  },
  samples: {
    type: FILTER_TYPE.INPUT,
    key: "samples__name",
    label: "Sample name",
  }
}

export const INDIVIDUAL_FILTERS = {
  id: {
    type: FILTER_TYPE.INPUT_NUMBER,
    key: "id",
    label: "ID",
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
    batch: true,
  },
  taxon: {
    type: FILTER_TYPE.SELECT,
    key: "taxon",
    label: "Taxon",
    mode: "multiple",
    placeholder: "All",
    options: TAXON.map(x => ({ label: x, value: x })),
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
    type: FILTER_TYPE.INPUT_NUMBER,
    key: "id",
    label: "ID",
  },
  process: {
    type: FILTER_TYPE.INPUT_NUMBER,
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
    type: FILTER_TYPE.INPUT_NUMBER,
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
    type: FILTER_TYPE.INPUT_NUMBER,
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
  samples__name: {
    type: FILTER_TYPE.INPUT,
    key: "samples__name",
    label: "Samples",
  },
  samples__id: {
    type: FILTER_TYPE.SELECT,
    key: "samples__id",
    label: "Samples ID",
    mode: "multiple",
  },
}
