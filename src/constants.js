
export const sampleFiltersConstants = {
  select: [
    {
      key: "biospecimen_type__in",
      name: "biospecimen type",
      mode: "multiple",
      placeholder: "All",
      options: ['DNA', 'RNA', 'BLOOD', 'SALIVA', 'SWAB'],
    },
    {
      key: "depleted",
      name: "depleted",
      mode: "multiple",
      placeholder: "All",
      options: ['true', 'false'],
    },
    {
      key: "individual__sex__in",
      name: "individual's sex",
      mode: "multiple",
      placeholder: "All",
      options: ['F', 'M', 'Unknown']
    }
  ],
  range: [
    {
      name: "concentration",
      min: "concentration__gte",
      max: "concentration__lte"
    },
    {
      name: "volume used",
      min: "volume_used__gte",
      max: "volume_used__lte"
    }
  ]
}

  
