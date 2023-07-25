/*
 * constants.tsx
 */

import { Rule } from "antd/lib/form"

export const FILTER_TYPE = {
  RANGE: "RANGE",
  DATE_RANGE: "DATE_RANGE",
  SELECT: "SELECT",
  INPUT: "INPUT",
  INPUT_NUMBER: "INPUT_NUMBER",
  INPUT_OBJECT_ID: "INPUT_OBJECT_ID",  // A freezeman object ID - a positive integer value
  METADATA: "METADATA",
} as const

export const SEX = [
  "M",
  "F",
  "Unknown",
] as const

export const PROJECT_STATUS = [
  "Open",
  "Closed",
] as const

export const QPCR_SELECTION_STATUS = [
   "Positive",
   "Negative",
   "Inconclusive",
   "Invalid",
 ] as const

export const DATE_FORMAT = "YYYY-MM-DD"

export const TOGGLE_OPTIONS = {
  POOLS: "Pools",
  SAMPLES: "Samples",
  LIBRARIES: "Libraries",
  ALL: "All"
} as const

// Validation constants

export const requiredRules : Rule[] = [{ required: true, message: 'Missing field' }]
export const externalIdRules : Rule[] = [{ pattern: /^P[0-9]{6}$/, message: 'Format: P000000' }]
export const barcodeRules : Rule[] = [{ pattern: /^[\S]{1,200}$/, message: 'Space not allowed.' }]
export const nameRules : Rule[] = [{ pattern: /^[a-zA-Z0-9.\-_]{1,200}$/, message: 'Characters allowed: [a-z], [A-Z], [0-9], or [ - ][ . ][ _ ].' }]
export const emailRules : Rule[] = [{ type: "email", message: "The input is not valid E-mail" }]
