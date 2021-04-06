/*
 * constants.js
 */

export const FILTER_TYPE = {
  RANGE: "RANGE",
  DATE_RANGE: "DATE_RANGE",
  SELECT: "SELECT",
  INPUT: "INPUT",
  INPUT_NUMBER: "INPUT_NUMBER",
}

export const TISSUE_SOURCE = [
  "BAL",
  "Biopsy",
  "Blood",
  "Cells",
  "Expectoration",
  "Gargle",
  "Plasma",
  "Saliva",
  "Swab",
  "Tumor",
  "Buffy coat",
  "Tail",
]

export const SEX = [
  "M",
  "F",
  "Unknown",
]

export const TAXON = [
  "Homo sapiens",
  "Mus musculus",
  "Sars-Cov-2",
]

export const DATE_FORMAT = "YYYY-MM-DD"

// Some foreign key fields
export const USER_FIELDS = ["created_by", "updated_by"]