import { useCallback, useRef } from "react"
import { CoordinateSpec, FMSId } from "../models/fms_api_models"
import { ContainerKind } from "../models/frontend_models"
import { CellIdentifier } from "../modules/placement/models"

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
    for (let i = 0; i < a.length && i < b.length; i++) {
        if (a[i] < b[i]) return -1
        if (a[i] > b[i]) return 1
    }
    if (a.length < b.length) return -1
    if (a.length > b.length) return 1
    return 0
}

export interface PlacementSample {
    id: FMSId
    selected: boolean
    name: string
    containerName: string
    coordinates?: string // only for real parent containers
    fromCell: CellIdentifier | null // null for tubes without parent
    placementCount: number
}
export function comparePlacementSamples(a: PlacementSample, b: PlacementSample, spec?: ContainerKind['coordinate_spec']) {
    const MAX = 1

    let orderA = MAX
    let orderB = MAX

    if (a.selected) orderA -= MAX / 2
    if (b.selected) orderB -= MAX / 2

    if (spec && a.coordinates && b.coordinates)  {
        const aOffsets = coordinatesToOffsets(spec, a.coordinates)
        const bOffsets = coordinatesToOffsets(spec, b.coordinates)
        const arrayComparison = compareArray(aOffsets.reverse(), bOffsets.reverse())
        if (arrayComparison < 0) orderA -= MAX / 4
        if (arrayComparison > 0) orderB -= MAX / 4
    }

    if (a.name < b.name) orderA -= MAX / 8
    if (a.name > b.name) orderB -= MAX / 8

    if (a.containerName < b.containerName) orderA -= MAX / 16
    if (a.containerName > b.containerName) orderB -= MAX / 16

    return orderA - orderB
}

export function smartQuerySetLookup(field: string, defaultSelection: boolean, exceptedIDs: FMSId[]) {
    if (exceptedIDs.length === 0) {
        return {}
    }
    if (defaultSelection) {
        return { [`${field}__not__in`]: exceptedIDs.join(',') }
    } else {
        return { [`${field}__in`]: exceptedIDs.join(',') }
    }
}

export function debounced<F extends (...args: any[]) => void>(delay: number, fn: F) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let savedArgs: Parameters<F>
  return (...args: Parameters<F>) => {
    savedArgs = args
    if (timeout)
      clearTimeout(timeout)
    timeout = setTimeout(() => {
      fn(...savedArgs)
      timeout = undefined
    }, delay)
  }
}

/**
 * A hook to debounce function calls until after the specified time.
 * This is used to avoid triggering calls to the backend while the user
 * is typing in a filter.
 */
export const useDebounce = <F extends (...args: any[]) => any>(debouncedFunction: F, debounceTime = 500) => {
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    return useCallback(function caller(...args: Parameters<F>) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const context = this
        if (timer.current) {
            clearTimeout(timer.current)
        }
        timer.current = setTimeout(
        () => {
            timer.current = undefined
            debouncedFunction.apply(context, args)
        }, debounceTime)
    }, [debounceTime, debouncedFunction])
}
