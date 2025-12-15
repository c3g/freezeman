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

export const requiredRules: Rule[] = [{ required: true, message: 'Missing field' }] as const
export const positiveIntegerRules: Rule[] = [{ pattern: /^(0|[1-9][0-9]*)$/, message: 'Only integers greater than or equal to zero.' }] as const
export const externalIdRules: Rule[] = [{ pattern: /^P[0-9]{6}$/, message: 'Format: P000000' }] as const
export const barcodeRules: Rule[] = [{ pattern: /^[\S]{1,200}$/, message: 'Space not allowed.' }] as const
export const nameRules: Rule[] = [{ pattern: /^[a-zA-Z0-9.\-_]{1,200}$/, message: 'Characters allowed: [a-z], [A-Z], [0-9], or [ - ][ . ][ _ ].' }] as const
export const nameWithoutDotRules: Rule[] = [{ pattern: /^[a-zA-Z0-9\-_]{1,200}$/, message: 'Characters allowed: [a-z], [A-Z], [0-9], or [ - ][ _ ].' }] as const
export const emailRules: Rule[] = [{ type: "email", message: "The input is not valid E-mail" }] as const

export const MAX_CONTAINER_BARCODE_LENGTH = 200
export const MAX_CONTAINER_NAME_LENGTH = 200

export const DEFAULT_PAGE_SIZE = 100
export const DEFAULT_SMALL_PAGE_SIZE = 10

export const TUBES_WIHOUT_PARENT_NAME = 'tubes without parent container'