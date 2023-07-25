/*
 * constants.js
 */

export const FILTER_TYPE = {
  RANGE: "RANGE",
  DATE_RANGE: "DATE_RANGE",
  SELECT: "SELECT",
  INPUT: "INPUT",
  INPUT_NUMBER: "INPUT_NUMBER",
  INPUT_OBJECT_ID: "INPUT_OBJECT_ID",  // A freezeman object ID - a positive integer value
  METADATA: "METADATA",
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

type ValidationRule = { required, message } | { type, message } | { pattern, message } | { pattern }

export const requiredRules : ValidationRule[] = [{ required: true, message: 'Missing field' }]
export const externalIdRules : ValidationRule[] = [{ pattern: /^P[0-9]{6}$/, message: 'Format: P000000' }]
export const barcodeRules : ValidationRule[] = [{ pattern: /^[\S]{1,200}$/, message: 'Space not allowed.' }]
export const nameRules : ValidationRule[] = [{ pattern: /^[a-zA-Z0-9.\-_]{1,200}$/, message: 'Characters allowed: [a-z], [A-Z], [0-9], or [ - ][ . ][ _ ].' }]
export const emailRules : ValidationRule[] = [{ type: "email", message: "The input is not valid E-mail" }]
