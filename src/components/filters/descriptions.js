import {FILTER_TYPE, BIOSPECIMEN_TYPE, SEX, TAXON} from "../../constants";

export const SAMPLE_FILTERS = {
  biospecimen_type: {
    type: FILTER_TYPE.SELECT,
    key: "biospecimen_type",
    label: "Type",
    mode: "multiple",
    placeholder: "All",
    options: BIOSPECIMEN_TYPE.map(x => ({ label: x, value: x })),
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
  },
  individual__name: {
    type: FILTER_TYPE.INPUT,
    key: "individual__name",
    label: "Individual Name",
  },
  container__name: {
    type: FILTER_TYPE.INPUT,
    key: "container__name",
    label: "Container Name",
  },
  container__barcode: {
    type: FILTER_TYPE.INPUT,
    key: "container__barcode",
    label: "Container Barcode",
  },
  coordinates: {
    type: FILTER_TYPE.INPUT,
    key: "coordinates",
    label: "Coordinates",
  },
  concentration: {
    type: FILTER_TYPE.RANGE,
    key: "concentration",
    label: "Concentration",
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
  individual__pedigree: {
    type: FILTER_TYPE.INPUT,
    key: "individual__pedigree",
    label: "Individual Pedigree",
    width: 250,
    detached: true,
  },
  individual__cohort: {
    type: FILTER_TYPE.INPUT,
    key: "individual__cohort",
    label: "Individual Cohort",
    width: 250,
    detached: true,
  },
  individual__sex: {
    type: FILTER_TYPE.SELECT,
    key: "individual__sex",
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
  collection_site: {
    type: FILTER_TYPE.INPUT,
    key: "collection_site",
    label: "Collection site",
    width: 250,
    detached: true,
  },
}

export const CONTAINER_FILTERS = {
  barcode: {
    type: FILTER_TYPE.INPUT,
    key: "barcode",
    label: "Barcode",
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
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
  samples: {
    type: FILTER_TYPE.INPUT,
    key: "samples__name",
    label: "Sample name",
  },
}

export const INDIVIDUAL_FILTERS = {
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name",
    label: "Name",
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

export const USER_FILTERS = {
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
