import { Draft, PayloadAction, original } from "@reduxjs/toolkit"
import { compareArray, coordinatesToOffsets, offsetsToCoordinates } from "../../utils/functions"
import { CellIdentifier, PlacementDirections, PlacementState, PlacementType, ParentContainerState, PlacementOptions, PlacementSample, ParentContainerIdentifier, RealParentContainerState, TubesWithoutParentState, SampleIdentifier, PlacementSampleEntry, PlacementSampleEntryWithParent, RealParentContainerIdentifier, PlacementCoordinates } from "./models"
import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"

export const initialState: PlacementState = {
    samples: [],
    parentContainers: [],
    placementType: PlacementType.GROUP,
    placementDirection: PlacementDirections.COLUMN,
    error: null,
} as const

export interface LoadParentContainerPayload {
    parentContainerName: string
    spec: CoordinateSpec
    cells: { coordinates: string, sample: SampleIdentifier, name: string, projectName: string }[]
}
export interface LoadTubesWithoutParentPayload {
    parentContainerName: null
    cells: { coordinates?: undefined, sample: SampleIdentifier, name: string, projectName: string }[]
}

export type LoadContainerPayload = LoadParentContainerPayload | LoadTubesWithoutParentPayload
export interface MouseOnCellPayload extends CellIdentifier {
    context: {
        sourceParentContainer?: ParentContainerState['name'] | null
        destinationParentContainer?: ParentContainerState['name'] | null
    }
}
export type MultiSelectPayload = {
    forcedSelectedValue?: boolean
} & ({
    parentContainer: ParentContainerState['name']
    type: 'row'
    row: number
} | {
    parentContainer: ParentContainerState['name']
    type: 'column'
    column: number
} | {
    parentContainer: ParentContainerState['name']
    type: 'all'
} | {
    parentContainer: ParentContainerState['name']
    type: 'sample-identifiers'
    samples: SampleIdentifier[]
})
export interface PlaceAllSourcePayload {
    source: ParentContainerIdentifier['parentContainer']
    destination: RealParentContainerIdentifier['parentContainer']
}


export function reducerWithThrows<P>(func: (state: Draft<PlacementState>, action: P) => void) {
    return (state: Draft<PlacementState>, action: PayloadAction<P>) => {
        try {
            state.error = null
            func(state, action.payload)
        } catch (error) {
            const originalState = original(state) ?? initialState
            Object.assign(state, originalState)
            state.error = error.message
        }
    }
}

export function loadContainerHelper(state: Draft<PlacementState>, payload: LoadContainerPayload) {
    /* Update or Add parent container */
    if (payload.parentContainerName) {
        const foundContainer = selectParentContainer(state, { parentContainer: payload.parentContainerName })
        if (!foundContainer) {
            state.parentContainers.push(initialParentContainerState(payload))
        }
    } else {
        const foundContainer = selectParentContainer(state, { parentContainer: null })
        if (!foundContainer) {
            const parentContainer: TubesWithoutParentState = {
                name: null,
                samples: [],
            }
            state.parentContainers.push(parentContainer)
        }
    }

    /* Update or Add samples */
    const payloadSamples: Set<SampleIdentifier> = new Set()
    for (const payloadCell of payload.cells) {
        payloadSamples.add(payloadCell.sample)

        let payloadSample: PlacementSample
        if (payloadCell.coordinates) {
            // with parent container
            payloadSample = {
                name: payloadCell.name,
                project: payloadCell.projectName,
                id: payloadCell.sample,
                parentContainer: payloadCell.name,
                container: 'unknown-container',
                coordinates: payloadCell.coordinates,
                highlight: false,
            }
        } else {
            // without parent container
            payloadSample = {
                name: payloadCell.name,
                project: payloadCell.projectName,
                id: payloadCell.sample,
                parentContainer: null,
                container: 'unknown-container',
                coordinates: null,
                highlight: false,
            }
        }

        const foundSampleIndex = findPlacementSampleIndex(state, payloadCell.sample)
        if (foundSampleIndex) {
            const foundSample = state.samples[foundSampleIndex]
            state.samples[foundSampleIndex] = {
                ...payloadSample,
                highlight: foundSample.highlight,
            }
        } else {
            state.samples.push(payloadSample)
        }
    }

    /* Remove samples that have disappeared */
    const disappearedSamples = Object.values(state.samples).reduce((samples, sample) => {
        if (sample.parentContainer === payload.parentContainerName && !payloadSamples.has(sample.id)) {
            samples.add(sample.id)
        }
        return samples
    }, new Set<SampleIdentifier>())
    removeSamples(state, ...disappearedSamples)
}

export function undoCellPlacement(state: Draft<PlacementState>, cellID: CellIdentifier) {
    const container = getRealParentContainer(state, cellID)
    const originalSample = selectOriginalPlacementSampleByCell(state, cellID)
    const samples = container.samples.filter((s) => s.coordinates !== cellID.coordinates && s.id !== originalSample?.id)
    container.samples = samples
}

export function initialParentContainerState(payload: LoadParentContainerPayload): RealParentContainerState {
    const cellsFinal: RealParentContainerState['cells'] = []
    const { parentContainerName, spec } = payload
    const [axisRow = [] as const, axisColumn = [] as const] = spec
    for (const row of axisRow) {
        for (const col of axisColumn) {
            const coordinates = row + col
            cellsFinal.push({
                coordinates,
                preview: false,
            })
        }
    }

    return {
        name: parentContainerName,
        spec,
        cells: cellsFinal,
        samples: [],
    }
}

export function atCellLocations(...ids: (CellIdentifier | ParentContainerIdentifier)[]) {
    return ids.map((id) => {
        if ('coordinates' in id) {
            return `${id.parentContainer}@${id.coordinates}`
        } else {
            return id.parentContainer
        }
    }).join(',')
}

export function selectParentContainer<S extends PlacementState>(state: S, location: ParentContainerIdentifier) {
    return state.parentContainers.find((c) => c.name === location.parentContainer)
}
export function getParentContainer<S extends PlacementState>(state: S, location: ParentContainerIdentifier) {
    const container = selectParentContainer(state, location)
    if (!container)
        throw new Error(`Container not loaded: "${JSON.stringify(location)}"`)
    return container
}
export function getRealParentContainer<S extends PlacementState>(state: S, location: RealParentContainerIdentifier) {
    const container = getParentContainer(state, location)
    if (!container.name)
        throw new Error('location.parentContainer must be in a parent container')
    return container
}

export function selectCell<S extends PlacementState>(state: S, location: CellIdentifier) {
    const container = getRealParentContainer(state, location)
    return container.cells.find((c) => c.coordinates === location.coordinates)
}
export function getCell<S extends PlacementState>(state: S, location: CellIdentifier) {
    const cell = selectCell(state, location)
    if (!cell)
        throw new Error(`Cell not loaded: "${atCellLocations(location)}"`)
    return cell
}

export function selectPlacementSample<S extends PlacementState>(state: S, sample: SampleIdentifier) {
    return state.samples.find((s) => s.id === sample)
}
export function getPlacementSample<S extends PlacementState>(state: S, sample: SampleIdentifier) {
    const placementSample = selectPlacementSample(state, sample)
    if (!placementSample)
        throw new Error(`Sample not loaded: "${sample}"`)
    return placementSample
}
export function selectOriginalPlacementSampleByCell<S extends PlacementState>(state: S, cellID: CellIdentifier) {
    return state.samples.find((s) => s.parentContainer === cellID.parentContainer && s.coordinates === cellID.coordinates)
}
export function selectPlacementSamplesByCell<S extends PlacementState>(state: S, cellID: CellIdentifier) {
    const container = getParentContainer(state, cellID)
    if (!container.name)
        throw new Error('cellID.parentContainer must be in a parent container')
    return container.samples.filter((s) => s.coordinates === cellID.coordinates)
}

export function placeSample(state: Draft<PlacementState>, sample: PlacementSampleEntry, destCell: CellIdentifier) {
    const foundSample = selectPlacementSamplesByCell(state, destCell).find((s) => s.id === sample.id)
    if (foundSample) {
        foundSample.amount += 1
    } else {
        const newSample: PlacementSampleEntryWithParent = {
            id: sample.id,
            parentContainer: destCell.parentContainer,
            coordinates: destCell.coordinates,
            amount: 1,
            selected: false,
        }
        const container = getRealParentContainer(state, destCell)
        container.samples.push(newSample)
    }
}

export function placementDestinationLocations(
    state: PlacementState,
    sourceSamples: Draft<PlacementSampleEntry>[],
    destination: CellIdentifier,
    placementOptions: PlacementOptions
): PlacementCoordinates[] {
    /**
     * If this function encounters an error, it will set state.error and return an array that might be less than the length of sources arguments
     */

    if (sourceSamples.length == 0) {
        return []
    }

    const newOffsetsList: number[][] = []
    const destinationContainer = getRealParentContainer(state, destination)
    const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, destination.coordinates)

    const [axisRow, axisCol] = destinationContainer.spec
    const height = axisRow?.length ?? 1
    const width = axisCol?.length ?? 1

    const sourceContainerNames = new Set(sourceSamples.map((s) => s.parentContainer ?? 'Tubes without parent'))
    if (sourceContainerNames.size > 1) {
        throw new Error('Cannot use pattern placement type with more than one source container')
    }

    switch (placementOptions.type) {
        case PlacementType.PATTERN: {
            const sourceSamplesWithParent = sourceSamples.reduce<Draft<PlacementSampleEntryWithParent>[]>((sourcesWithParent, source) => {
                if (! ('coordinates' in source)) {
                    throw new Error('For pattern placement, all source cells must be in a parent container')
                }
                sourcesWithParent.push(source)
                return sourcesWithParent
            }, [])

            const sourceOffsetsList = sourceSamplesWithParent.map((source) => {
                const parentContainer = getRealParentContainer(state, source)
                return coordinatesToOffsets(parentContainer.spec, source.coordinates)
            })

            // find top left corner that tightly bounds all of the selections
            const minOffsets = sourceOffsetsList.reduce((minOffsets, offsets) => {
                return offsets.map((_, index) => offsets[index] < minOffsets[index] ? offsets[index] : minOffsets[index])
            }, sourceOffsetsList[0])


            newOffsetsList.push(
                ...sourceOffsetsList.map(
                    (sourceOffsets) => destinationContainer.spec.map(
                        (_: CoordinateAxis, index: number) => sourceOffsets[index] - minOffsets[index] + destinationStartingOffsets[index]
                    )
                )
            )
            break
        }
        case PlacementType.GROUP: {
            const relativeOffsetByIndices = [...sourceSamples.keys()].sort((indexA, indexB) => {
                const a = sourceSamples[indexA]
                const b = sourceSamples[indexB]
                return comparePlacementSamples(state , a, b, getRealParentContainer(state, destination))
            }).reduce<Record<number, number>>((relativeOffsetByIndices, sortedIndex, index) => {
                relativeOffsetByIndices[sortedIndex] = index
                return relativeOffsetByIndices
            }, {})

            for (const sourceIndex in sourceSamples) {
                const relativeOffset = relativeOffsetByIndices[sourceIndex]
                const [startingRow, startingCol] = destinationStartingOffsets

                const { ROW, COLUMN } = PlacementDirections
                const finalOffsets = {
                    [ROW]: startingRow,
                    [COLUMN]: startingCol
                }

                if (placementOptions.direction === PlacementDirections.ROW) {
                    finalOffsets[COLUMN] += relativeOffset
                    const finalColBeforeWrap = finalOffsets[1]
                    if (finalColBeforeWrap >= width) {
                        finalOffsets[COLUMN] = finalColBeforeWrap % width
                        finalOffsets[ROW] += Math.floor(finalColBeforeWrap / width)
                    }
                } else if (placementOptions.direction === PlacementDirections.COLUMN) {
                    finalOffsets[ROW] += relativeOffset
                    const finalRowBeforeWrap = finalOffsets[0]
                    if (finalRowBeforeWrap >= height) {
                        finalOffsets[ROW] = finalRowBeforeWrap % height
                        finalOffsets[COLUMN] += Math.floor(finalRowBeforeWrap / height)
                    }
                }

                newOffsetsList.push([finalOffsets[ROW], finalOffsets[COLUMN]])
            }
        }
    }

    return newOffsetsList.reduce<PlacementCoordinates[]>((results, offsets) => {
        try {
            results.push(offsetsToCoordinates(offsets, destinationContainer.spec))
        } catch (e) {
            state.error ??= e.message
        }
        return results
    }, [])
}

export function placeSamplesHelper(state: Draft<PlacementState>, sources: PlacementSampleEntry[], destination: CellIdentifier, placementOptions: PlacementOptions) {
    if (sources.length > 0) {
        // relying on placeCell to do error checking
        const destinations = placementDestinationLocations(state, sources, destination, placementOptions)
        if (state.error) throw { message: state.error } // placementDestinationLocations threw an error at some point

        sources.forEach((_, index) => {
            const destCellID = { parentContainer: destination.parentContainer, coordinates: destinations[index] }
            placeSample(state, sources[index], destCellID)

            sources[index].selected = false
            getCell(state, destCellID).preview = false
        })
    }
}

export function getPlacementOption(state: PlacementState): PlacementOptions {
    return state.placementType === PlacementType.PATTERN
        ? { type: PlacementType.PATTERN }
        : { type: PlacementType.GROUP, direction: state.placementDirection }
}

export function clickCellHelper(state: Draft<PlacementState>, clickedLocation: MouseOnCellPayload) {
    const { sourceParentContainer, destinationParentContainer } = clickedLocation.context

    const samples = selectPlacementSamplesByCell(state, clickedLocation)
    const selectionSuccess = multiSelectionHelper(state, {
        parentContainer: clickedLocation.parentContainer,
        type: 'sample-identifiers',
        samples: samples.map((s) => s.id),
    })
    if (selectionSuccess.length === 0) {
        if (clickedLocation.parentContainer === destinationParentContainer) {
            if (sourceParentContainer === undefined) {
                throw new Error('Cannot place samples without a source container')
            }
            const sourceContainer = getParentContainer(state, { parentContainer: sourceParentContainer })
            placeSamplesHelper(
                state, 
                sourceContainer.samples,
                clickedLocation,
                getPlacementOption(state)
            )
        }
    }
}

export function setPreviews(state: Draft<PlacementState>, onMouseLocation: MouseOnCellPayload, preview: boolean) {
    if (onMouseLocation.context.sourceParentContainer !== undefined) {
        const activeSelections = getParentContainer(state, { parentContainer: onMouseLocation.context.sourceParentContainer }).samples.filter((c) => c.selected)
        const destinationLocations = placementDestinationLocations(state, activeSelections, onMouseLocation, getPlacementOption(state))
        destinationLocations.forEach((location) => {
            getCell(state, { parentContainer: onMouseLocation.parentContainer, coordinates: location }).preview = preview
        })
    }
}

export function selectionMultipleSamples(samples: Draft<PlacementSampleEntry>[], forcedSelectedValue?: boolean) {
    const allSelected = !samples.find((c) => !c.selected)
    samples.forEach((sample) => {
        sample.selected = forcedSelectedValue ?? !allSelected
    })
}

export function selectPlacementSampleEntries(state: Draft<PlacementState>, location: CellIdentifier): Draft<PlacementSampleEntry>[] {
    const samples = selectPlacementSamplesByCell(state, location)
    const sampleIDs = samples.map((s) => s.id)
    const container = getParentContainer(state, location)
    return container.samples.filter((s) => sampleIDs.includes(s.id))
}

export function selectPlacementSampleEntry(state: Draft<PlacementState>, location: ParentContainerIdentifier, sampleID: SampleIdentifier) {
    const container = getParentContainer(state, location)
    return container.samples.find((s) => s.id === sampleID)
}

export function multiSelectionHelper(state: Draft<PlacementState>, payload: MultiSelectPayload) {
    const container = getParentContainer(state, { parentContainer: payload.parentContainer })

    if (payload.type === 'sample-identifiers') {
        const sampleIDs = new Set(payload.samples)
        const samples = container.samples.filter((s) => sampleIDs.has(s.id))
        selectionMultipleSamples(samples, payload.forcedSelectedValue)
        return samples
    }

    if (payload.type === 'all') {
        selectionMultipleSamples(container.samples, payload.forcedSelectedValue)
        return container.samples
    }

    if (!container.name)
        throw new Error('For row and column selection, container must be a parent container')

    const [rowAxis = [] as const, colAxis = [] as const] = container.spec
    const rowSize = rowAxis.length
    const colSize = colAxis.length

    const offsetsList: number[][] = []
    switch (payload.type) {
        case 'row': {
            if (!(0 <= payload.row && payload.row < rowSize)) {
                throw new Error(`Row ${payload.row} is not within the range of [0, ${rowSize})`)
            }
            for (let col = 0; col < colSize; col++) {
                offsetsList.push([payload.row, col])
            }
            break
        }
        case 'column': {
            if (!(0 <= payload.column && payload.column < colSize)) {
                throw new Error(`Column ${payload.column} is not within the range of [0, ${colSize})`)
            }
            for (let row = 0; row < rowSize; row++) {
                offsetsList.push([row, payload.column])
            }
            break
        }
    }

    const samples = offsetsList
        .map((offsets) => ({
            parentContainer: container.name,
            coordinates: offsetsToCoordinates(offsets, container.spec)
        }))
        .flatMap((id) => selectPlacementSampleEntries(state, id))
    selectionMultipleSamples(samples, payload.forcedSelectedValue)
    return samples
}

export function comparePlacementSamples(state: PlacementState, a: PlacementSampleEntry, b: PlacementSampleEntry, container?: RealParentContainerState): number {
    const MAX = 128

    const sampleA = getPlacementSample(state, a.id)
    const sampleB = getPlacementSample(state, b.id)

    let orderA = MAX
    let orderB = MAX

    if (a.selected) orderA -= MAX/2
    if (b.selected) orderB -= MAX/2

    if (container?.spec && 'coordinates' in a && 'coordinates' in b) {
        // if both have coordinates, both have a parent container (that's hopefully the same)
        const aOffsets = coordinatesToOffsets(container.spec, a.coordinates)
        const bOffsets = coordinatesToOffsets(container.spec, b.coordinates)
        const arrayComparison = compareArray(aOffsets.reverse(), bOffsets.reverse())
        if (arrayComparison < 0) orderA -= MAX/4
        if (arrayComparison > 0) orderB -= MAX/4
    }

    if (sampleA.name < sampleB.name) orderA -= MAX/8
    if (sampleA.name > sampleB.name) orderB -= MAX/8

    if (sampleA.project < sampleA.project) orderA -= MAX/16
    if (sampleA.project > sampleA.project) orderB -= MAX/16

    return orderA - orderB

}

function findPlacementSampleIndex(state: PlacementState, id: SampleIdentifier) {
    return state.samples.findIndex((s) => s.id === id)
}

function removeSamples(state: Draft<PlacementState>, ...samples: Array<SampleIdentifier>) {
    const sampleSet = new Set(samples)
    state.samples = state.samples.filter((s) => !sampleSet.has(s.id))
    return state.samples
}
