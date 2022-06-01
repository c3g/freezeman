export const constVal = x => () => x;

export function NumberFormat(number, afterDecimal = 0, round = true) {
    const regex = RegExp(`(^[0-9]+\.[0-9]{0,${afterDecimal}})|(^[0-9]+)`, "g")
    return number.toFixed(afterDecimal + (round ? 0 : 1)).match(regex)[0]
}
