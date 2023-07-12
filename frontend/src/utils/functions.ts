export function constVal<T>(x: T) {
    return () => x
}

export function isNullish(nullable: any): nullable is null | undefined {
    return nullable === undefined || nullable === null
}