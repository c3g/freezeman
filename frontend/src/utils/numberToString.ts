import { isNullish } from "./functions"

/**
 * @param {number} number
 */
export function numberToString(number: number) {
  if (isNullish(number))
    return ""
  return number.toLocaleString('fr').replace(/,/g, ".") // Format enforces the spaces between each 3 digits and the international comma (,) is replaced by the american decimal dot (.).
}