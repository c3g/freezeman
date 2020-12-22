import {FILTER_TYPE, BIOSPECIMEN_TYPE} from "../../constants";

export const SAMPLE_FILTERS = {
  name__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "name__icontains",
    label: "Name",
    width: 250,
  },
  biospecimen_type__in: {
    type: FILTER_TYPE.SELECT,
    key: "biospecimen_type__in",
    label: "Type",
    mode: "multiple",
    placeholder: "All",
    options: BIOSPECIMEN_TYPE.map(x => ({ label: x, value: x })),
  },
  container__barcode__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "container__barcode__icontains",
    label: "Container Barcode",
    width: 250,
  },
  container__name__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "container__name__icontains",
    label: "Container Name",
    width: 250,
  },
  collection_site__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "collection_site__icontains",
    label: "Collection site",
    width: 250,
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
    ]
  },
  concentration: {
    type: FILTER_TYPE.RANGE,
    key: "concentration",
    label: "Concentration",
  },
  individual__label__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "individual__label__icontains",
    label: "Individual Label",
    width: 250,
  },
  individual__pedigree__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "individual__pedigree__icontains",
    label: "Individual Pedigree",
    width: 250,
  },
  individual__cohort__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "individual__cohort__icontains",
    label: "Individual Cohort",
    width: 250,
  },
}

export const CONTAINER_FILTERS = {
  barcode__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "barcode__icontains",
    label: "Barcode",
    width: 250,
  },
  name__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "name__icontains",
    label: "Name",
    width: 250,
  },
  coordinates__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "coordinates__icontains",
    label: "Coordinates",
    width: 80,
  },
  samples__name__icontains: {
    type: FILTER_TYPE.INPUT,
    key: "samples__name__icontains",
    label: "Sample name",
    width: 250,
  },
  kind__in: {
    type: FILTER_TYPE.SELECT,
    key: "kind__in",
    label: "Kind",
    mode: "multiple",
    placeholder: "All",
  },
}
