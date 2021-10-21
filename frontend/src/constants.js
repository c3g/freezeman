/*
 * constants.js
 */

export const FILTER_TYPE = {
  RANGE: "RANGE",
  DATE_RANGE: "DATE_RANGE",
  SELECT: "SELECT",
  INPUT: "INPUT",
  INPUT_NUMBER: "INPUT_NUMBER"
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

export const STATUS = [
  "Open",
  "Closed",
]

export const DATE_FORMAT = "YYYY-MM-DD"

// Validation constants
export const requiredRules = [{ required: true, message: 'Missing field' }]
export const barcodeRules = [{ pattern: /^[\S]{1,200}$/ }]
export const nameRules = [{ pattern: /^[a-zA-Z0-9.\-_]{1,200}$/ }]
export const emailRules = [{ type: "email", message: "The input is not valid E-mail" }]

// Sub-protocols-list
export const subProtocols = [
  'Infinium: Amplification',
  'Infinium: Fragmentation',
  'Infinium: Precipitation',
  'Infinium: Hybridization',
  'Infinium: Wash Beadchip',
  'Infinium: Extend and Stain',
  'Infinium: Scan Preparation',
]
