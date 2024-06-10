import { CoordinateSpec } from "../models/fms_api_models"
import { CellState } from "../modules/placement/models"

export function constVal<T>(x: T) {
    return () => x
}

export function isNullish(nullable: any): nullable is null | undefined {
    return nullable === undefined || nullable === null
}

export function isDefined(nullable: any) {
    return !isNullish(nullable)
}

export function coordinatesToOffsets(spec: CoordinateSpec, coordinates: string) {
    const offsets: number[] = []
    const originalCoordinates = coordinates
    for (const axis of spec) {
        if (coordinates.length === 0) {
            throw new Error(`Cannot convert coordinates ${originalCoordinates} with spec ${JSON.stringify(spec)} to offsets at axis ${axis}`)
        }
        const offset = axis.findIndex((coordinate) => coordinates.startsWith(coordinate))
        if (offset < 0) {
            throw new Error(`Cannot convert coordinates ${originalCoordinates} with spec ${JSON.stringify(spec)} to offsets at axis ${axis}`)
        }
        offsets.push(offset)
        coordinates = coordinates.slice(axis[offset].length)
    }

    return offsets
}

export function offsetsToCoordinates(offsets: readonly number[], spec: CoordinateSpec) {
    if (spec.length !== offsets.length) {
        throw new Error(`Cannot convert offsets ${JSON.stringify(offsets)} to coordinates with spec ${JSON.stringify(spec)}`)
    }

    const coordinates: string[] = []
    for (let i = 0; i < spec.length; i++) {
        if (offsets[i] < 0) {
            throw new Error('Numbers in offsets argument cannot be negative')
        }
        if (offsets[i] >= spec[i].length) {
            throw new Error(`Cannot convert offset ${JSON.stringify(offsets)} to coordinates with spec ${JSON.stringify(spec)} at axis ${i}`)
        }
        coordinates.push(spec[i][offsets[i]])
    }
    return coordinates.join('')
}

export function compareArray(a: readonly number[], b: readonly number[]): number {
    if (a.length > b.length) return 1
    if (a.length < b.length) return -1
    for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) return -1
        if (a[i] > b[i]) return 1
    }
    return 0
}

export function comparePlacementSamples<S extends Pick<CellState, 'coordinates' | 'parentContainerName' | 'name' | 'projectName' | 'selected'>>(a: S, b: S, spec?: CoordinateSpec): number {
    const MAX = 128

    let orderA = MAX
    let orderB = MAX

    if (a.selected) orderA -= MAX/2
    else if (b.selected) orderB -= MAX/2

    if (spec && a.coordinates && b.coordinates) {
        // if both have coordinates, both have a parent container
        const aOffsets = coordinatesToOffsets(spec, a.coordinates)
        const bOffsets = coordinatesToOffsets(spec, b.coordinates)
        const arrayComparison = compareArray(aOffsets.reverse(), bOffsets.reverse())
        if (arrayComparison > 0) orderB -= MAX/4
        else if (arrayComparison < 0) orderA -= MAX/4
    }

    if (a.name > b.name) orderB -= MAX/8
    else if (a.name < b.name) orderA -= MAX/8

    // if (!a.parentContainerName) orderA -= MAX/16
    // else if (!b.parentContainerName) orderB -= MAX/16
    // else if (a.parentContainerName > b.parentContainerName) orderB -= MAX/16
    // else if (a.parentContainerName < b.parentContainerName) orderA -= MAX/16

    if (a.projectName > b.projectName) orderB -= MAX/32
    else if (a.projectName < b.projectName) orderA -= MAX/32

    return orderA - orderB

}