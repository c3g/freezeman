export function constVal<T>(x: T) {
    return () => x
}

export function isNullish(nullable: any): nullable is null | undefined {
    return nullable === undefined || nullable === null
}

export function isDefined(nullable: any) {
    return !isNullish(nullable)
}

export function createURLSearchParams(queryParams: ConstructorParameters<typeof URLSearchParams>[0]): URLSearchParams {
    const result = new URLSearchParams(queryParams)

    const undefinedKeys: string[] = []

    result.forEach((value, key) => {
        if (value === 'undefined') {
            undefinedKeys.push(key)
        }
    })

    undefinedKeys.forEach((key) => result.set(key, ''))

    return result
}