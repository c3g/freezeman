/*
 * constants.js
 */

export const FILTER_TYPE = {
  RANGE: "RANGE",
  DATE_RANGE: "DATE_RANGE",
  SELECT: "SELECT",
  INPUT: "INPUT",
  INPUT_NUMBER: "INPUT_NUMBER",
  INPUT_OBJECT_ID: "INPUT_OBJECT_ID"  // A freezeman object ID - a positive integer value
}

export const SEX = [
  "M",
  "F",
  "Unknown",
]

export const PROJECT_STATUS = [
  "Open",
  "Closed",
]

export const QPCR_SELECTION_STATUS = [
   "Positive",
   "Negative",
   "Inconclusive",
   "Invalid",
 ]

export const DATE_FORMAT = "YYYY-MM-DD"

export const TOGGLE_OPTIONS = {
  POOLS: "Pools",
  SAMPLES: "Samples",
  LIBRARIES: "Libraries",
  ALL: "All"
}

// Validation constants
export const requiredRules = [{ required: true, message: 'Missing field' }]
export const barcodeRules = [{ pattern: /^[\S]{1,200}$/ }]
export const nameRules = [{ pattern: /^[a-zA-Z0-9.\-_]{1,200}$/ }]
export const emailRules = [{ type: "email", message: "The input is not valid E-mail" }]
