import React from "react";

export const sampleFiltersConstants = {
  select: [
    {
      key: "depleted",
      name: "depleted",
      mode: "",
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
      key: "concentration",
      name: "concentration",
      min: "concentration__gte",
      max: "concentration__lte"
    },
    {
      key: "volume_used",
      name: "volume used",
      min: "volume_used__gte",
      max: "volume_used__lte"
    }
  ]
}

  
