export function constVal<T>(x: T) {
    return () => x
}

export function isNullish(nullable: any): nullable is null | undefined {
    return nullable === undefined || nullable === null
}

export function isDefined(nullable: any) {
    return !isNullish(nullable)
}

export function createURLSearchParams(queryParams: Record<string, any>): URLSearchParams {
    queryParams = Object.fromEntries(Object.entries(queryParams).map(([key, value]) => isNullish(value) ? [key, ''] : [key, value]))

    const result = new URLSearchParams(queryParams)

    return result
}