import { Draft, PayloadAction, original } from "@reduxjs/toolkit"
import { compareArray, coordinatesToOffsets, offsetsToCoordinates } from "../../utils/functions"
import { CellIdentifier, PlacementDirections, PlacementState, PlacementType, ParentContainerState, PlacementOptions, SampleDetail, ParentContainerIdentifier, RealParentContainerState, SampleIdentifier, PlacementSample, PlacementSampleWithParent, RealParentContainerIdentifier, PlacementCoordinates, CellState } from "./models"
import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"

/* Initial State */

export const initialState: PlacementState = {
    samples: [],
    parentContainers: [],
    placementType: PlacementType.GROUP,
    placementDirection: PlacementDirections.COLUMN,
    error: null,
} as const

/* Action Payloads */

export interface LoadParentContainerPayload {
    parentContainerName: string
    spec: CoordinateSpec
    cells: { container: string, coordinates: string, sample: SampleIdentifier, name: string, projectName: string }[]
}
export interface LoadTubesWithoutParentPayload {
    parentContainerName: null
    cells: { container: string, coordinates?: undefined, sample: SampleIdentifier, name: string, projectName: string }[]
}

export type LoadContainerPayload = (LoadParentContainerPayload | LoadTubesWithoutParentPayload) & { volume: number }
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

/* Action Helpers */

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
    // Update or Add parent container
    getOrCreateParentContainer(
        state,
        payload.parentContainerName
            ? initialParentContainerState(payload)
            : { name: null, existingSamples: [] }
    )

    // Update or Add samples
    const payloadSampleIDs: Set<SampleIdentifier> = new Set()
    for (const payloadCell of payload.cells) {
        payloadSampleIDs.add(payloadCell.sample)

        let payloadSample: SampleDetail
        if (payloadCell.coordinates) {
            // with parent container
            payloadSample = {
                name: payloadCell.name,
                project: payloadCell.projectName,
                id: payloadCell.sample,
                parentContainer: payloadCell.name,
                container: payloadCell.container,
                coordinates: payloadCell.coordinates,
                highlight: false,
                volume: payload.volume,
            }
        } else {
            // without parent container
            payloadSample = {
                name: payloadCell.name,
                project: payloadCell.projectName,
                id: payloadCell.sample,
                parentContainer: null,
                container: payloadCell.container,
                coordinates: null,
                highlight: false,
                volume: payload.volume,
            }
        }

        const sample = getOrCreateExistingSample(state, payloadSample)
        const { highlight } = sample
        Object.assign(sample, payloadSample)
        sample.highlight = highlight
    }

    // Remove samples that have disappeared
    const disappearedSamples = state.samples.filter((s) => s.parentContainer === payload.parentContainerName && !payloadSampleIDs.has(s.id))
    removeSamples(state, ...disappearedSamples.map((s) => s.id))
}

export function clickCellHelper(state: Draft<PlacementState>, clickedLocation: MouseOnCellPayload) {
    const { sourceParentContainer, destinationParentContainer } = clickedLocation.context

    const samples = selectSamplesByCellAndIDs(state, clickedLocation)
    const selectionSuccess = multiSelectionHelper(state, {
        parentContainer: clickedLocation.parentContainer,
        type: 'sample-identifiers',
        samples: samples.map((s) => s.id),
    })
    if (selectionSuccess.length === 0) {
        // no samples have been (de)selected

        if (clickedLocation.parentContainer === destinationParentContainer) {
            if (sourceParentContainer === undefined) {
                throw new Error('Cannot place samples without a source container')
            }
            const sourceSamples = reducePlacementSamples<PlacementSample[]>(state, { parentContainer: sourceParentContainer }, (sourceSamples, sample) => {
                if (sample.selected) {
                    sourceSamples.push(sample)
                }
                return sourceSamples
            }, [])
            placeSamples(
                state,
                sourceSamples,
                clickedLocation,
                getPlacementOption(state)
            )
        }
    }
}

export function placeAllSourceHelper(state: Draft<PlacementState>, payload: PlaceAllSourcePayload) {
    const samples = selectPlacementSamplesByParentContainerAndSampleIDs(state, { parentContainer: payload.source })

    const container = getParentContainer(state, { parentContainer: payload.destination })
    if ('spec' in container) {
        const [axisRow, axisCol = [''] as const] = container.spec
        if (axisRow === undefined) return state

        // use pattern placement to place all source starting from the top-left of destination
        placeSamples(
            state,
            samples, {
            parentContainer: payload.destination,
            coordinates: axisRow[0] + axisCol[0]
        }, {
            type: PlacementType.PATTERN
        })
    }
}

export function onCellEnterHelper(state: Draft<PlacementState>, payload: MouseOnCellPayload) {
    const container = getRealParentContainer(state, payload)
    if (container.name === payload.context.destinationParentContainer)
        // must be destination
        setPreviews(state, payload, true)
}

export function onCellExitHelper(state: Draft<PlacementState>, payload: MouseOnCellPayload) {
    const container = getRealParentContainer(state, payload)
    if (container.name === payload.context.destinationParentContainer) {
        // must be destination
        reduceCells(state, payload, (_, cell) => {
            cell.preview = false
            return _
        }, undefined)
    }
}

export function undoSelectedSamplesInContainerHelper(state: Draft<PlacementState>, parentContainer: RealParentContainerIdentifier['parentContainer']) {
    reducePlacementSamplesWithParent(state, { parentContainer: parentContainer }, (_, sample) => {
        if (sample.selected) {
            undoSamplePlacement(state, sample)
        }
        return _
    }, undefined)
}

export function flushContainersHelper(state: Draft<PlacementState>, parentContainers?: Array<ParentContainerState['name']>) {
    const containersToDelete = new Set(
        parentContainers
        ??
        reduceParentContainers<Array<ParentContainerState['name']>>(state, (containers, container) => {
            containers.push(container.name)
            return containers
        }, [])
    )
    state.parentContainers = state.parentContainers.filter((c) => !containersToDelete.has(c.name))
    const samplesToDelete = reduceSampleDetails(state, (samplesToDelete, sample) => {
        if (containersToDelete.has(sample.parentContainer)) {
            samplesToDelete.add(sample.id)
        }
        return samplesToDelete
    }, new Set<SampleIdentifier>())
    removeSamples(state, ...samplesToDelete)
}

/* Selectors Helpers */

export function selectParentContainer(state: PlacementState, location: ParentContainerIdentifier) {
    return state.parentContainers.find((c) => c.name === location.parentContainer)
}
export function getParentContainer(state: PlacementState, location: ParentContainerIdentifier) {
    const container = selectParentContainer(state, location)
    if (!container)
        throw new Error(`Container not loaded: "${JSON.stringify(location)}"`)
    return container
}
export function getRealParentContainer(state: PlacementState, location: RealParentContainerIdentifier) {
    const container = getParentContainer(state, location)
    if (!container.name)
        throw new Error('location.parentContainer must be in a parent container')
    return container
}
export function getTubesWithoutParent(state: PlacementState) {
    const container = getParentContainer(state, { parentContainer: null })
    if (container.name !== null)
        throw new Error('Tubes without parent must be in a container')
    return container
}

export function selectCell(state: PlacementState, location: CellIdentifier) {
    const container = getRealParentContainer(state, location)
    return container.cells.find((c) => c.coordinates === location.coordinates)
}
export function getCell(state: PlacementState, location: CellIdentifier) {
    const cell = selectCell(state, location)
    if (!cell)
        throw new Error(`Cell not loaded: "${atCellLocations(location)}"`)
    return cell
}

export function selectSampleDetail(state: Pick<PlacementState, 'samples'>, sample: SampleIdentifier) {
    return state.samples.find((s) => s.id === sample)
}
export function getSampleDetail(state: Pick<PlacementState, 'samples'>, sample: SampleIdentifier) {
    const sampleDetail = selectSampleDetail(state, sample)
    if (!sampleDetail)
        throw new Error(`Sample not loaded: "${sample}"`)
    return sampleDetail
}
export function selectOriginalSampleDetailOfCell(state: PlacementState, location: CellIdentifier) {
    return state.samples.find((s) => s.parentContainer === location.parentContainer && s.coordinates === location.coordinates)
}

export function selectSamplesByCellAndIDs(state: PlacementState, location: CellIdentifier, ...sampleIDs: Array<SampleIdentifier>) {
    const sampleIDSet = new Set(sampleIDs)
    const container = getRealParentContainer(state, location)
    return [
        ...container.existingSamples.filter((s) => s.coordinates === location.coordinates && (sampleIDSet.size > 0 ? sampleIDSet.has(s.id) : true)),
        ...container.placedSamples.filter((s) => s.coordinates === location.coordinates && (sampleIDSet.size > 0 ? sampleIDSet.has(s.id) : true)),
    ]
}
export function selectPlacementSamplesByParentContainerAndSampleIDs(state: PlacementState, location: ParentContainerIdentifier, ...samples: Array<SampleIdentifier>) {
    const sampleIDSet = new Set(samples)
}

export function getPlacementOption(state: PlacementState): PlacementOptions {
    return state.placementType === PlacementType.PATTERN
        ? { type: PlacementType.PATTERN }
        : { type: PlacementType.GROUP, direction: state.placementDirection }
}

/* Helper Helpers */

export function undoSamplePlacement(state: Draft<PlacementState>, cellID: CellIdentifier) {
    const samplesToNotRemove = reduceSampleDetails(state, (samplesToNotRemove, sampleDetail) => {
        if (sampleDetail.parentContainer === cellID.parentContainer && sampleDetail.coordinates === cellID.coordinates) {
            samplesToNotRemove.add(sampleDetail.id)
        }
        return samplesToNotRemove
    }, new Set<SampleIdentifier>())
    const samplesRetained = reducePlacementSamplesWithParent<PlacementSampleWithParent[]>(state, { parentContainer: cellID.parentContainer }, (samples, sample) => {
        if (sample.coordinates !== cellID.coordinates || samplesToNotRemove.has(sample.id)) {
            samples.push(sample)
        }
        return samples
    }, [])

    const container = getRealParentContainer(state, cellID)
    container.placedSamples = samplesRetained
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

export function placeSample(state: Draft<PlacementState>, sample: PlacementSample, destCell: CellIdentifier) {
    const [foundSample] = selectSamplesByCellAndIDs(state, destCell, sample.id)
    if (!foundSample) {
        const newSample: PlacementSampleWithParent = {
            id: sample.id,
            parentContainer: destCell.parentContainer,
            coordinates: destCell.coordinates,
            selected: false,
            volume: '0',
        }
        return getOrCreatePlacedSample(state, newSample) as PlacementSampleWithParent
    }
    return foundSample
}

export function placementDestinationLocations(
    state: PlacementState,
    sourceSamples: Draft<PlacementSample>[],
    destination: CellIdentifier,
    placementOptions: PlacementOptions
): [PlacementCoordinates[], string | undefined] {
    /**
     * If this function encounters an error, it will set state.error and return an array that might be less than the length of sources arguments
     */

    if (sourceSamples.length == 0) {
        return [[], undefined]
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
            const sourceSamplesWithParent = sourceSamples.reduce<Draft<PlacementSampleWithParent>[]>((sourcesWithParent, source) => {
                if (!('coordinates' in source)) {
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
                return comparePlacementSamples(state, a, b, getRealParentContainer(state, destination))
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

    return newOffsetsList.reduce<[PlacementCoordinates[], string | undefined]>((results, offsets) => {
        try {
            results[0].push(offsetsToCoordinates(offsets, destinationContainer.spec))
        } catch (e) {
            results[1] ??= e.message
        }
        return results
    }, [[], undefined])
}

export function placeSamples(state: Draft<PlacementState>, sources: PlacementSample[], destination: CellIdentifier, placementOptions: PlacementOptions) {
    if (sources.length > 0) {
        // relying on placeSample to do error checking
        const [destinations, error] = placementDestinationLocations(state, sources, destination, placementOptions)
        if (error) throw { message: error } // placementDestinationLocations threw an error at some point

        sources.forEach((_, index) => {
            const destCellID = { parentContainer: destination.parentContainer, coordinates: destinations[index] }
            placeSample(state, sources[index], destCellID)

            sources[index].selected = false
            getCell(state, destCellID).preview = false
        })
    }
}

export function setPreviews(state: Draft<PlacementState>, onMouseLocation: MouseOnCellPayload, preview: boolean) {
    if (onMouseLocation.context.sourceParentContainer !== undefined) {
        const activeSelections = getParentContainer(state, { parentContainer: onMouseLocation.context.sourceParentContainer }).samples.filter((c) => c.selected)
        const [destinationLocations] = placementDestinationLocations(state, activeSelections, onMouseLocation, getPlacementOption(state))
        destinationLocations.forEach((location) => {
            getCell(state, { parentContainer: onMouseLocation.parentContainer, coordinates: location }).preview = preview
        })
    }
}

export function selectionMultipleSamples(samples: Draft<PlacementSample | SampleDetail>[], forcedSelectedValue?: boolean) {
    const allSelected = !samples.find((c) => !c.selected)
    samples.forEach((sample) => {
        sample.selected = forcedSelectedValue ?? !allSelected
    })
}

export function multiSelectionHelper(state: Draft<PlacementState>, payload: MultiSelectPayload) {
    const container = getParentContainer(state, { parentContainer: payload.parentContainer })
    const samples = [
        ...selectPlacementSamplesByParentContainerAndSampleIDs(state, { parentContainer: container.name }),
        ...reduceSampleDetails<SampleDetail[]>(state, (samples, sample) => {
            if (sample.parentContainer === container.name) {
                samples.push(sample)
            }
            return samples
        }, [])
    ]

    if (payload.type === 'sample-identifiers') {
        const sampleIDs = new Set(payload.samples)
        const samplesToSelect = samples.filter((s) => sampleIDs.has(s.id))
        selectionMultipleSamples(samplesToSelect, payload.forcedSelectedValue)
        return samplesToSelect
    }

    if (payload.type === 'all') {
        selectionMultipleSamples(samples, payload.forcedSelectedValue)
        return samples
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

    const rowColSamples = offsetsList
        .map((offsets) => ({
            parentContainer: container.name,
            coordinates: offsetsToCoordinates(offsets, container.spec)
        }))
        .flatMap((cellID) => selectSamplesByCellAndIDs(state, cellID))
    selectionMultipleSamples(rowColSamples, payload.forcedSelectedValue)
    return rowColSamples
}

export function comparePlacementSamples(state: Pick<PlacementState, 'samples'>, a: PlacementSample, b: PlacementSample, container?: RealParentContainerState): number {
    const MAX = 128

    const sampleA = getSampleDetail(state, a.id)
    const sampleB = getSampleDetail(state, b.id)

    let orderA = MAX
    let orderB = MAX

    if (a.selected) orderA -= MAX / 2
    if (b.selected) orderB -= MAX / 2

    if (container?.spec && 'coordinates' in a && a.coordinates && 'coordinates' in b && b.coordinates) {
        // if both have coordinates, both have a parent container (that's hopefully the same)
        const aOffsets = coordinatesToOffsets(container.spec, a.coordinates)
        const bOffsets = coordinatesToOffsets(container.spec, b.coordinates)
        const arrayComparison = compareArray(aOffsets.reverse(), bOffsets.reverse())
        if (arrayComparison < 0) orderA -= MAX / 4
        if (arrayComparison > 0) orderB -= MAX / 4
    }

    if (sampleA.name < sampleB.name) orderA -= MAX / 8
    if (sampleA.name > sampleB.name) orderB -= MAX / 8

    if (sampleA.project < sampleA.project) orderA -= MAX / 16
    if (sampleA.project > sampleA.project) orderB -= MAX / 16

    return orderA - orderB

}

function getOrCreateParentContainer(state: Draft<PlacementState>, parentContainer: ParentContainerState) {
    const foundContainer = selectParentContainer(state, { parentContainer: parentContainer.name })
    if (foundContainer) {
        return foundContainer
    } else {
        state.parentContainers.push(parentContainer)
        return parentContainer
    }
}
function getOrCreateExistingSample(state: Draft<PlacementState>, sample: SampleDetail) {
    const foundSample = selectSampleDetail(state, sample.id)
    if (foundSample) {
        return foundSample
    } else {
        state.samples.push(sample)
        const container = getParentContainer(state, { parentContainer: sample.parentContainer })
        if (container.name !== null) {
            if (!sample.coordinates) {
                throw new Error(`Sample ${sample.name} must have coordinates if it has a parent container`)
            }
            container.existingSamples.push({
                id: sample.id,
                selected: false,
                volume: sample.volume,
            })
        } else if (container.name === null) {
            const container = getTubesWithoutParent(state)
            container.existingSamples.push({
                id: sample.id,
                selected: false,
                volume: sample.volume,
            })
        }
        return sample
    }
}
function getOrCreatePlacedSample(state: Draft<PlacementState>, sample: PlacementSample) {
    const [foundSample] = selectPlacementSamplesByParentContainerAndSampleIDs(state, { parentContainer: sample.parentContainer }, sample.id)
    if (foundSample) {
        return foundSample
    } else {
        if (sample.parentContainer === null) {
            const container = getTubesWithoutParent(state)
            container.samples.push(sample)
        } else {
            const container = getRealParentContainer(state, { parentContainer: sample.parentContainer })
            container.samples.push(sample)
        }
        return sample
    }
}

function flushPlacementSamples(state: Draft<PlacementState>) {
    const samplesToNotRemove = reduceSampleDetails(state, (samplesToNotRemove, sample) => {
        samplesToNotRemove.add(sample.id)
        return samplesToNotRemove
    }, new Set<SampleIdentifier>())
    reduceParentContainers(state, (_, container) => {
        if (container.name === null) {
            container.samples = container.samples.filter((s) => samplesToNotRemove.has(s.id))
        } else {
            container.samples = container.samples.filter((s) => samplesToNotRemove.has(s.id))
        }
        return _
    }, undefined)
}

function removeSamples(state: Draft<PlacementState>, ...samples: Array<SampleIdentifier>) {
    const samplesToRemove = new Set(samples)
    state.samples = state.samples.filter((s) => !samplesToRemove.has(s.id))
    flushPlacementSamples(state)
    return state.samples
}
