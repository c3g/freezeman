import {FILTER_TYPE, BIOSPECIMEN_TYPE, SEX, TAXON} from "../../constants";

export const SAMPLE_FILTERS = {
  biospecimen_type: {
    type: FILTER_TYPE.SELECT,
    key: "biospecimen_type__in",
    label: "Type",
    mode: "multiple",
    placeholder: "All",
    options: BIOSPECIMEN_TYPE.map(x => ({ label: x, value: x })),
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name__icontains",
    label: "Name",
  },
  individual: {
    type: FILTER_TYPE.INPUT,
    key: "individual__name__icontains",
    label: "Individual Name",
  },
  container_name: {
    type: FILTER_TYPE.INPUT,
    key: "container__name__icontains",
    label: "Container Name",
  },
  container: {
    type: FILTER_TYPE.INPUT,
    key: "container__barcode__icontains",
    label: "Container Barcode",
  },
  coordinates: {
    type: FILTER_TYPE.INPUT,
    key: "coordinates__icontains",
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
  individual__pedigree__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "individual__pedigree__icontains",
    label: "Individual Pedigree",
    width: 250,
    detached: true,
  },
  individual__cohort__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "individual__cohort__icontains",
    label: "Individual Cohort",
    width: 250,
    detached: true,
  },
  individual__sex__in: {
    type: FILTER_TYPE.SELECT,
    key: "individual__sex__in",
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
  collection_site__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "collection_site__icontains",
    label: "Collection site",
    width: 250,
    detached: true,
  },
}

export const CONTAINER_FILTERS = {
  barcode: {
    type: FILTER_TYPE.INPUT,
    key: "barcode__icontains",
    label: "Barcode",
  },
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name__icontains",
    label: "Name",
  },
  kind: {
    type: FILTER_TYPE.SELECT,
    key: "kind__in",
    label: "Kind",
    mode: "multiple",
    placeholder: "All",
  },
  coordinates: {
    type: FILTER_TYPE.INPUT,
    key: "coordinates__icontains",
    label: "Coordinates",
  },
  samples: {
    type: FILTER_TYPE.INPUT,
    key: "samples__name__icontains",
    label: "Sample name",
  },
}

export const INDIVIDUAL_FILTERS = {
  name: {
    type: FILTER_TYPE.INPUT,
    key: "name__icontains",
    label: "Name",
  },
  taxon: {
    type: FILTER_TYPE.SELECT,
    key: "taxon__in",
    label: "Taxon",
    mode: "multiple",
    placeholder: "All",
    options: TAXON.map(x => ({ label: x, value: x })),
  },
  sex: {
    type: FILTER_TYPE.SELECT,
    key: "sex__in",
    label: "Sex",
    mode: "multiple",
    placeholder: "All",
    options: SEX.map(x => ({ label: x, value: x })),
  },
  pedigree: {
    type: FILTER_TYPE.INPUT,
    key: "pedigree__icontains",
    label: "Pedigree",
  },
  cohort: {
    type: FILTER_TYPE.INPUT,
    key: "cohort__icontains",
    label: "Cohort",
  },
}

export const USER_FILTERS = {
  username: {
    type: FILTER_TYPE.INPUT,
    key: "username__icontains",
  },
  email: {
    type: FILTER_TYPE.INPUT,
    key: "email__icontains",
  }, 
}
