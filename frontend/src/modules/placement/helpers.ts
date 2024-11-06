import { Draft, PayloadAction, original } from "@reduxjs/toolkit"
import { coordinatesToOffsets, offsetsToCoordinates } from "../../utils/functions"
import { CellIdentifier, PlacementDirections, PlacementState, PlacementType, ParentContainerState } from "./models"
import { CoordinateSpec } from "../../models/fms_api_models"
import { Sample } from "../../models/frontend_models"

export const initialState: PlacementState = {
    samples: [],
    sampleIndexByName: {},
    sampleIndexByCellWithParent: {},
    parentContainers: [],
    placementType: PlacementType.GROUP,
    placementDirection: PlacementDirections.COLUMN,
    error: null,
} as const

export interface LoadParentContainerPayload {
    parentContainerName: string
    spec: CoordinateSpec
    cells: { coordinates: string, sample: Sample['id'], name: string, projectName: string }[]
}
export interface LoadTubesWithoutParentPayload {
    parentContainerName: null
    cells: { coordinates?: undefined, sample: Sample['id'], name: string, projectName: string }[]
}

export type LoadContainerPayload = LoadParentContainerPayload | LoadTubesWithoutParentPayload
export interface MouseOnCellPayload extends CellIdentifier {
    context: {
        sourceSamples: Array<Sample['name']>
    } | {
        parentContainer: CellIdentifier['parentContainer']
    } | {
        parentContainer: CellIdentifier['parentContainer']
        coordinates: CellIdentifier['coordinates']
    }
}
export type MultiSelectPayload = {
    forcedSelectedValue: boolean // false means toggle-based selection
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
    type: 'sample-ids'
    sampleIDs: Array<Sample['id']>
})
export interface PlaceAllSourcePayload {
    source: ParentContainerState['name'] | null
    destination: ParentContainerState['name']
}


export function reducerWithThrows<P>(func: (state: Draft<PlacementState>, action: P) => void) {
    return (state: Draft<PlacementState>, action: PayloadAction<P>) => {
        try {
            state.error = undefined
            func(state, action.payload)
        } catch (error) {
            const originalState = original(state) ?? initialState
            Object.assign(state, originalState)
            state.error = error.message
        }
    }
}

export function undoCellPlacement(state: Draft<PlacementState>, cell: Draft<CellState>) {
    cell.selected = false
    if (cell.placedAt) {
        const destCell = getCell(state, cell.placedAt)
        destCell.placedFrom = null
        destCell.selected = false

        cell.placedAt = null
    }
    if (cell.placedFrom) {
        const sourceCell = getCell(state, cell.placedFrom)
        sourceCell.placedAt = null
        sourceCell.selected = false

        cell.placedFrom = null
    }
}

export function initialParentContainerState(payload: LoadParentContainerPayload): ParentContainerState {
    const cellsFinal: ParentContainerState['cells'] = []
    const { parentContainerName, spec, cells } = payload
    const cellsIndexByCoordinates: ParentContainerState['cellsIndexByCoordinates'] = {}
    const [axisRow = [] as const, axisColumn = [] as const] = spec
    for (const row of axisRow) {
        for (const col of axisColumn) {
            const coordinates = row + col
            cellsFinal.push({
                preview: false,
                selected: false,
            })
            cellsIndexByCoordinates[coordinates] = cells.length - 1
        }
    }

    return {
        name: parentContainerName,
        spec,
        cells: cellsFinal,
        cellsIndexByCoordinates,
    }
}

export function atCellLocations(...ids: CellIdentifier[]) {
    return ids.map((id) => [id.sample, id.parentContainerName, id.coordinates].filter((x) => x).join('@')).join(',')
}

export const selectContainer = (state: PlacementState) => (location: ParentContainerIdentifier) => {
    return location.parentContainer
        ? Object.values(state.parentContainers).find((c) => c.name === location.parentContainer)
        : state.tubesWithoutParent
}
export function getContainer(state: Draft<PlacementState>, location: ParentContainerIdentifier): Draft<ParentContainerState> {
    const container = selectContainer(state)(location)
    if (!container)
        throw new Error(`Container not loaded: "${JSON.stringify(location)}"`)
    return container
}
export function getParentContainer(state: Draft<PlacementState>, location: ParentContainerIdentifier | CellIdentifier) {
    const container = getContainer(state, location)
    if (container.name === null)
        throw new Error(`getExistingParentContainer was called with location: ${JSON.stringify(location)}`)
    return container
}

export const selectCell = (state: PlacementState) => (location: CellIdentifier) => {
    let cell: undefined | CellWithParentState = undefined
    
    if (location.parentContainer != null) {
        const container = getParentContainer(state, location)
        cell = container.cells[container.cellsIndexByCoordinates[location.coordinates]]
    }

    return cell
}
export function getCell(state: Draft<PlacementState>, location: CellIdentifier): Draft<CellWithParentState> {
    const cell = selectCell(state)(location)
    if (!cell)
        throw new Error(`Cell not loaded: "${atCellLocations(location)}"`)
    return cell
}

export function getCellLocationsFromSampleNames(state: Draft<PlacementState>, samples: Draft<PlacementSample['name']>[]): (CellIdentifier | null)[] {
    return samples.map((name) => {
        const sampleIndex = state.sampleIndexByName[name]
        if (sampleIndex === undefined) {
            throw new Error(`Sample ${name} not found in sampleIndexByName`)
        }
        const sample = state.samples[sampleIndex]
        if (sample.parentContainer !== null) {
            return {
                parentContainer: sample.parentContainer,
                coordinates: sample.coordinates
            }
        } else {
            return null
        }
    })
}

export function placeCell(sourceCell: Draft<CellState>, destCell: Draft<CellWithParentState>) {
    if (!sourceCell.sample) {
        throw new Error(`Source container at "${atCellLocations(sourceCell)}" has no sample`)
    }
    if (sourceCell.placedAt) {
        throw new Error(`Source sample from ${atCellLocations(sourceCell)} already placed (at ${atCellLocations(sourceCell.placedAt)})`)
    }

    if (destCell.placedFrom) {
        throw new Error(`Destination container at ${atCellLocations(destCell)} already contains a sample from ${atCellLocations(destCell.placedFrom)}`)
    }
    if (destCell.sample !== null) {
        throw new Error(`Destination container at ${atCellLocations(destCell)} already contains a sample that has not been placed elsewhere`)
    }

    sourceCell.placedAt = destCell
    destCell.placedFrom = sourceCell
}

export function placementDestinationLocations(state: PlacementState, sources: Draft<CellState>[], destination: Draft<CellWithParentState>, placementOptions: PlacementOptions): Draft<CellWithParentState>[] {
    /**
     * If this function encounters an error, it will set state.error and return an array that might be less than the length of sources arguments
     */

    if (sources.length == 0) {
        return []
    }

    const newOffsetsList: number[][] = []
    const destinationContainer = getParentContainer(state, destination)
    const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, destination.coordinates)

    const [axisRow, axisCol] = destinationContainer.spec
    const height = axisRow?.length ?? 1
    const width = axisCol?.length ?? 1

    const sourceContainerNames = new Set(sources.map((s) => s.parentContainerName))
    if (sourceContainerNames.size > 1) {
        throw new Error('Cannot use pattern placement type with more than one source container')
    }

    switch (placementOptions.type) {
        case PlacementType.PATTERN: {
            const sourceOffsetsList = sources.map((source) => {
                const parentContainer = getParentContainer(state, source)
                if (!source.coordinates)
                    throw new Error(`For pattern placement, source cell must be in a parent container`)
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
            const relativeOffsetByIndices = [...sources.keys()].sort((indexA, indexB) => {
                const a = sources[indexA]
                const b = sources[indexB]
                return comparePlacementSamples(a, b, getContainer(state, a).spec)
            }).reduce<Record<number, number>>((relativeOffsetByIndices, sortedIndex, index) => {
                relativeOffsetByIndices[sortedIndex] = index
                return relativeOffsetByIndices
            }, {})

            for (const sourceIndex in sources) {
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

    return newOffsetsList.reduce((results, offsets) => {
        try {
            const coordinates = offsetsToCoordinates(offsets, destinationContainer.spec)
            results.push(getCellWithParent(state, { parentContainerName: destinationContainer.name, coordinates }))
        } catch (e) {
            state.error ??= e.message
        }
        return results
    }, [] as Draft<CellWithParentState>[])
}

export function cellSelectable(state: PlacementState, id: CellIdentifier, context: MouseOnCellPayload['context']): boolean {
    const cell = getCell(state, id)
    let sourceLocation: CellIdentifier
    if ('sourceSamples' in context) {
        const loc = getCellLocationsFromSampleNames(state, context.sourceSamples)[0]
        if (loc === null) {
            throw new Error(`Sample ${context.sourceSamples[0]} not found in sampleIndexByName`)
        }
        sourceLocation = loc
    } else if ('coordinates' in context) {
        sourceLocation = { parentContainer: context.parentContainer, coordinates: context.coordinates }
    } else {
        throw new Error(`Invalid context: ${JSON.stringify(context)}`)
    }
    
}

export function placeCellsHelper(state: Draft<PlacementState>, sources: Draft<CellState>[], destination: Draft<CellWithParentState>, placementOptions: PlacementOptions) {
    if (sources.length > 0) {
        // relying on placeCell to do error checking

        const destinations = placementDestinationLocations(state, sources, destination, placementOptions)
        if (state.error) throw { message: state.error } // placementDestinationLocations threw an error at some point

        sources.forEach((_, index) => {
            placeCell(sources[index], destinations[index])
            sources[index].selected = false
            destinations[index].preview = false
        })
    }
}

export function getPlacementOption(state: PlacementState): PlacementOptions {
    return state.placementType === PlacementType.PATTERN
        ? { type: PlacementType.PATTERN }
        : { type: PlacementType.GROUP, direction: state.placementDirection }
}

export function clickCellHelper(state: Draft<PlacementState>, clickedLocation: MouseOnCellPayload) {
    if (cellSelectable(state, clickedLocation, clickedLocation.context)) {
        const clickedCell = getCell(state, clickedLocation)
        clickedCell.selected = !clickedCell.selected
    }

    if (!isSource && sourceContainerName !== undefined) {
        const sourceContainer = getContainer(state, { name: sourceContainerName })
        const destCell = getCell(state, clickedLocation)
        placeCellsHelper(state, sourceContainer.cells.filter((c) => c.selected), destCell, getPlacementOption(state))
    }
}

export function setPreviews(state: Draft<PlacementState>, onMouseLocation: MouseOnCellPayload, preview: boolean) {
    if (onMouseLocation.context.source !== undefined) {
        const activeSelections = getContainer(state, { name: onMouseLocation.context.source }).cells.filter((c) => c.selected)
        const destCell = getCell(state, onMouseLocation)
        const destinationLocations = placementDestinationLocations(state, activeSelections, destCell, getPlacementOption(state))
        destinationLocations.forEach((location) => {
            getCell(state, location).preview = preview
        })
    }
}

export function selectMultipleCells(cells: Draft<CellState>[], forcedSelectedValue?: boolean) {
    const allSelected = !cells.find((c) => !c.selected)
    cells.forEach((cell) => {
        cell.selected = forcedSelectedValue ?? !allSelected
    })
}

export function multiSelectHelper(state: Draft<PlacementState>, payload: MultiSelectPayload) {
    const container = getContainer(state, { name: payload.parentContainer })
    const isSource = container.name === payload.context.source

    if (payload.type === 'sample-ids') {
        const sampleIDs = new Set(payload.sampleIDs)
        const cells = container.cells.reduce((cells, cell) => {
            let sample = cell.sample
            if (!sample && cell.placedFrom) {
                sample = getCell(state, cell.placedFrom).sample
            }
            if (sample && sampleIDs.has(sample)) {
                cells.push(cell)
            }
            return cells
        }, [] as Draft<CellState>[])
        selectMultipleCells(cells, payload.forcedSelectedValue)
        return
    }

    if (payload.type === 'all') {
        selectMultipleCells(container.cells.filter((c) => cellSelectable(state, c, isSource)), payload.forcedSelectedValue)
        return
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

    const cells = offsetsList
        .map((offsets) => ({
            parentContainerName: payload.parentContainer,
            coordinates: offsetsToCoordinates(offsets, container.spec)
        }))
        .filter((id) => cellSelectable(state, id, isSource))
        .map((id) => getCell(state, id))
    selectMultipleCells(cells, payload.forcedSelectedValue)
}
