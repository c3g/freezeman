
export const FILTER_TYPE = {
  RANGE: "RANGE",
  SELECT: "SELECT",
}

export const SAMPLE_FILTERS = {
  concentration: {
    type: FILTER_TYPE.RANGE,
    key: "concentration",
    label: "Concentration",
  },
  volume_used: {
    type: FILTER_TYPE.RANGE,
    key: "volume_used",
    label: "Volume Used",
  },
  biospecimen_type__in: {
    type: FILTER_TYPE.SELECT,
    key: "biospecimen_type__in",
    label: "Type",
    mode: "multiple",
    placeholder: "All",
    options: [
      { label: "DNA",    value: "DNA" },
      { label: "RNA",    value: "RNA" },
      { label: "BLOOD",  value: "BLOOD" },
      { label: "SALIVA", value: "SALIVA" },
      { label: "SWAB",   value: "SWAB "},
    ],
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
}

export const CONTAINER_FILTERS = {
  kind__in: {
    type: FILTER_TYPE.SELECT,
    key: "kind__in",
    label: "Kind",
    mode: "multiple",
    placeholder: "All",
  },
}
