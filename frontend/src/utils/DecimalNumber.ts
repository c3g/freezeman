export class DecimalNumber extends Number {
    wholeNumber() {
        return Math.trunc(this.valueOf())
    }
    toString() {
        const valueStr = this.valueOf().toString()
        if (!valueStr.includes('.')) {
            return valueStr
        }
        return valueStr.replace(/^0+/, '').replace(/0+$/, '')
    }
    decimalPartUpToSignificantFigures(significantFigures: number) {
        const valueStr = this.toString()
        const [_, decimalPart] = valueStr.split('.')
        if (!decimalPart) {
            return '0.'.padEnd(significantFigures, '0')
        }
        const [leadingZerosAfterDecimal] = decimalPart.match(/^0+/) ?? ['']
        const temporary = parseFloat('0.' + decimalPart.slice(leadingZerosAfterDecimal.length)).toFixed(significantFigures - leadingZerosAfterDecimal.length)
        return this.wholeNumber().toString() + '.' + leadingZerosAfterDecimal + temporary.slice(2)
    }
}