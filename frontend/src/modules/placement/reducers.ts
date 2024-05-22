import { Draft, PayloadAction, createSlice, original } from "@reduxjs/toolkit"
import { Container, Sample } from "../../models/frontend_models"
import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"
import { CellIdentifier, CellState, CellWithParentIdentifier, CellWithParentState, ContainerIdentifier, ContainerState, ParentContainerState, PlacementDirections, PlacementGroupOptions, PlacementOptions, PlacementState, PlacementType, TubesWithoutParentState } from "./models"
import { compareArray, coordinatesToOffsets, offsetsToCoordinates } from "../../utils/functions"

export type LoadContainerPayload = LoadParentContainerPayload | LoadTubesWithoutParentPayload
export interface MouseOnCellPayload extends CellWithParentIdentifier {
    context: {
        source?: ContainerState['name']
    }
}
export type MultiSelectPayload = {
    forcedSelectedValue?: boolean
    context: {
        source?: ContainerState['name']
    }
} & ({
    parentContainer: ParentContainerState['name']
    type: 'row'
    row: number
} | {
    parentContainer: ParentContainerState['name']
    type: 'column'
    column: number
} | {
    parentContainer: ContainerState['name']
    type: 'all'
} | {
    parentContainer: ContainerState['name']
    type: 'sample-ids' // also checks cell.placedFrom
    sampleIDs: Array<Sample['id']>
})
export interface PlaceAllSourcePayload {
    source: ContainerIdentifier['name']
    destination: ParentContainerState['name']
}

const initialState: PlacementState = {
    containers: [] as PlacementState['containers'],
    placementType: PlacementType.GROUP,
    placementDirection: PlacementDirections.COLUMN,
} as const

const slice = createSlice({
    name: 'PLACEMENT',
    initialState,
    reducers: {
        loadContainer: reducerWithThrows((state, payload: LoadContainerPayload) => {
            const foundContainer = state.containers.find((container) => container.name === payload.parentContainerName)

            // initialize container state
            const containerState = foundContainer ?? (
                payload.parentContainerName !== null
                    ? initialParentContainerState(payload)
                    : ({
                        name: null,
                        spec: [],
                        cells: [],
                        cellsIndexBySampleID: {},
                    } as TubesWithoutParentState)
            )

            // create container state based only on payload
            const payloadContainerState = payload.parentContainerName
                ? initialParentContainerState(payload)
                : ({ name: null, cells: [], cellsIndexBySampleID: {}, spec: [] } as TubesWithoutParentState)
            for (const payloadCell of payload.cells) {
                if (payloadContainerState.name && payloadCell.coordinates) {
                    // with parent container
                    const index = payloadContainerState.cellsIndexByCoordinates[payloadCell.coordinates]
                    payloadContainerState.cells[index] = {
                        parentContainerName: payloadContainerState.name,
                        coordinates: payloadCell.coordinates,
                        sample: payloadCell.sample,
                        selected: false,
                        preview: false,
                        placedAt: null,
                        placedFrom: null
                    }
                    payloadContainerState.cellsIndexBySampleID[payloadCell.sample] = index
                } else if (payloadContainerState.name === null) {
                    // without parent container
                    payloadContainerState.cellsIndexBySampleID[payloadCell.sample] = payloadContainerState.cells.length
                    payloadContainerState.cells.push({ parentContainerName: null, sample: payloadCell.sample, selected: false, placedAt: null })
                }
            }

            // merge cells between payload and current state
            if (containerState.name) {
                // with parent container
                // cells are assumed to be sorted by coordinates and of the same spec
                for (const index in containerState.cells) {
                    const payloadCell = payloadContainerState.cells[index]
                    const currentCell = containerState.cells[index]
                    // make current cell states match payload cell states
                    if (payloadCell.sample !== currentCell.sample) {
                        undoCellPlacement(state, currentCell)
                        if (currentCell.sample)
                            delete containerState.cellsIndexBySampleID[currentCell.sample]
                        currentCell.sample = payloadCell.sample
                        if (payloadCell.sample)
                            containerState.cellsIndexBySampleID[payloadCell.sample] = Number(index)
                    }
                }
            } else if (containerState.name === null) {
                // without parent container
                // remove stale samples
                containerState.cells = containerState.cells.filter((currentCell) => {
                    if (currentCell.sample && !(currentCell.sample in payloadContainerState.cellsIndexBySampleID)) {
                        // sample has disappeared
                        undoCellPlacement(state, currentCell)
                        // no point in setting sample to null if the cell gets removed
                        return false
                    }
                    return true
                })
                // add only new samples from payload
                for (const payloadCell of payloadContainerState.cells) {
                    if (payloadCell.sample && payloadCell.parentContainerName === null && !(payloadCell.sample in containerState.cellsIndexBySampleID)) {
                        containerState.cells.push(payloadCell)
                    }
                }
                // update cellsIndexBySampleID
                containerState.cellsIndexBySampleID = {}
                for (const [index, currentCell] of containerState.cells.entries()) {
                    if (currentCell.sample)
                        containerState.cellsIndexBySampleID[currentCell.sample] = index
                }
            }
            if (!foundContainer) {
                // this whole time we've been updating a new container state
                state.containers.push(containerState)
            }
        }),
        setPlacementType(state, action: PayloadAction<PlacementOptions['type']>) {
            state.placementType = action.payload
        },
        setPlacementDirection(state, action: PayloadAction<PlacementGroupOptions['direction']>) {
            state.placementDirection = action.payload
        },
        clickCell: reducerWithThrows(clickCellHelper),
        placeAllSource: reducerWithThrows((state, payload: PlaceAllSourcePayload) => {
            const sourceCells = getContainer(state, { name: payload.source }).cells.filter((c) => c.sample)

            const [axisRow, axisCol = [''] as const] = getParentContainer(state, { name: payload.destination }).spec
            if (axisRow === undefined) return state

            // use pattern placement to place all source starting from the top-left of destination
            placeCellsHelper(state, sourceCells, getCellWithParent(state, {
                parentContainerName: payload.destination,
                coordinates: axisRow[0] + axisCol[0]
            }), {
                type: PlacementType.PATTERN
            })
        }),
        multiSelect: reducerWithThrows(multiSelectHelper),
        onCellEnter: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getParentContainer(state, payload)
            // must be destination
            if (container.name !== payload.context.source)
                setPreviews(state, payload, true)
        }),
        onCellExit: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getParentContainer(state, payload)
            // must be destination
            if (container.name !== payload.context.source) {
                for (const cell of container.cells) {
                    cell.preview = false
                }
            }
        }),
        undoSelectedSamples: reducerWithThrows((state, parentContainer: Container['name']) => {
            const container = getContainer(state, { name: parentContainer })
            let cells = container.cells.filter((c) => c.selected)
            if (cells.length === 0) {
	        // 0 cells have been selected, so undo placement for all cells
                cells = container.cells
            }

            // undo placements
            for (const cell of cells) {
                undoCellPlacement(state, cell)
            }
        }),
        flushContainers(state, action: PayloadAction<Array<ContainerState['name']>>) {
            const deletedContainerNames = new Set(action.payload ?? state.containers.map((c) => c.name))
            for (const parentContainer of state.containers) {
                for (const cell of parentContainer.cells) {
                    if (
                        (cell.placedAt?.parentContainerName !== undefined && deletedContainerNames.has(cell.placedAt.parentContainerName))
                        ||
                        (cell.placedFrom?.parentContainerName !== undefined && deletedContainerNames.has(cell.placedFrom.parentContainerName))
                    ) {
                        undoCellPlacement(state, cell)
                    }
                }
            }
	    state.containers = state.containers.filter((c) => !deletedContainerNames.has(c.name))
        },
	flushPlacement(state) {
	    Object.assign(state, initialState)
	}
    }
})

export const {
    loadContainer,
    setPlacementType,
    setPlacementDirection,
    clickCell,
    placeAllSource,
    onCellEnter,
    onCellExit,
    multiSelect,
    undoSelectedSamples,
    flushContainers,
    flushPlacement,
} = slice.actions
export default slice.reducer

function reducerWithThrows<P>(func: (state: Draft<PlacementState>, action: P) => void) {
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

function undoCellPlacement(state: Draft<PlacementState>, cell: Draft<CellState>) {
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

function initialParentContainerState(payload: LoadParentContainerPayload): ParentContainerState {
    const cells: ParentContainerState['cells'] = []
    const { parentContainerName, spec } = payload
    const cellsIndexByCoordinates: ParentContainerState['cellsIndexByCoordinates'] = {}
    if (parentContainerName && spec) {
        const [axisRow = [] as const, axisColumn = [] as const] = spec
        for (const row of axisRow) {
            for (const col of axisColumn) {
                const coordinates = row + col
                cellsIndexByCoordinates[coordinates] = cells.length
                cells.push({
                    parentContainerName,
                    coordinates,
                    sample: null,
                    preview: false,
                    selected: false,
                    placedAt: null,
                    placedFrom: null,
                })
            }
        }
    }

    return {
        name: parentContainerName,
        spec,
        cells,
        cellsIndexByCoordinates,
        cellsIndexBySampleID: {}
    }
}

interface LoadParentContainerPayload {
    parentContainerName: string
    spec: CoordinateSpec
    cells: { coordinates: string, sample: Sample['id'] }[]
}
interface LoadTubesWithoutParentPayload {
    parentContainerName: null
    cells: { coordinates?: undefined, sample: Sample['id'] }[]
}

function atCellLocations(...ids: CellIdentifier[]) {
    return ids.map((id) => [id.sample, id.parentContainerName, id.coordinates].filter((x) => x).join('@')).join(',')
}

export const selectContainer = (state: PlacementState) => (location: ContainerIdentifier | CellIdentifier) => {
    let containerName: ContainerIdentifier['name'] = null
    if ('parentContainerName' in location) {
        containerName = location.parentContainerName
    } else if ('name' in location) {
        containerName = location.name
    }

    return state.containers.find((c) => c.name === containerName)
}
function getContainer(state: Draft<PlacementState>, location: ContainerIdentifier | CellIdentifier): Draft<ContainerState> {
    const container = selectContainer(state)(location)
    if (!container)
        throw new Error(`Container not loaded: "${JSON.stringify(location)}"`)
    return container
}
function getParentContainer(state: Draft<PlacementState>, location: ContainerIdentifier | CellIdentifier) {
    const container = getContainer(state, location)
    if (container.name === null)
        throw new Error(`getExistingParentContainer was called with location: ${JSON.stringify(location)}`)
    return container
}

export const selectCell = (state: PlacementState) => (location: CellIdentifier) => {
    const container = getContainer(state, location)
    let cell: undefined | CellState = undefined

    if (location.coordinates && container.name !== null) {
        cell = container.cells[container.cellsIndexByCoordinates[location.coordinates]]
    } else if (location.sample) {
        cell = container.cells[container.cellsIndexBySampleID[location.sample]]
    }

    return cell
}
function getCell(state: Draft<PlacementState>, location: CellIdentifier): Draft<CellState> {
    const cell = selectCell(state)(location)
    if (!cell)
        throw new Error(`Cell not loaded: "${atCellLocations(location)}"`)
    return cell
}
function getCellWithParent(state: Draft<PlacementState>, location: CellIdentifier) {
    const cell = getCell(state, location)
    if (!cell.parentContainerName) {
        throw new Error(`The cell found ('${atCellLocations(location)}') was not in a parent container`)
    }
    return cell
}

function placeCell(sourceCell: Draft<CellState>, destCell: Draft<CellWithParentState>) {
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

function placementDestinationLocations(state: PlacementState, sources: Draft<CellState>[], destination: Draft<CellWithParentState>, placementOptions: PlacementOptions): Draft<CellWithParentState>[] {
    /**
     * If this function encounters an error, it will set state.error and return an array that might be less than the length of sources arguments
     */

    if (sources.length == 0) {
        return []
    }

    const newOffsetsList: number[][] = []
    const destinationContainer = getParentContainer(state, destination)
    const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, destination.coordinates)

    const [ axisRow, axisCol ] = destinationContainer.spec
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
                const offsetsA = a.coordinates ? coordinatesToOffsets(getContainer(state, a).spec, a.coordinates) : []
                const offsetsB = b.coordinates ? coordinatesToOffsets(getContainer(state, b).spec, b.coordinates) : []
                const comparison = placementOptions.direction === PlacementDirections.COLUMN
                    ? compareArray(offsetsA.reverse(), offsetsB.reverse())
                    : compareArray(offsetsA, offsetsB)
                return comparison
            }).reduce<Record<number, number>>((relativeOffsetByIndices, sortedIndex, index) => {
                relativeOffsetByIndices[sortedIndex] = index
                return relativeOffsetByIndices
            }, {})

            for (const sourceIndex in sources) {
                const relativeOffset = relativeOffsetByIndices[sourceIndex]
                const [startingRow, startingCol] = destinationStartingOffsets                

                const finalOffsets = [startingRow, startingCol]

                if (placementOptions.direction === PlacementDirections.ROW) {
                    finalOffsets[1] += relativeOffset
                    const finalColBeforeWrap = finalOffsets[1]
                    if (finalColBeforeWrap >= width) {
                        finalOffsets[1] = finalColBeforeWrap % width
                        finalOffsets[0] += Math.floor(finalColBeforeWrap / width)
                    }
                } else if (placementOptions.direction === PlacementDirections.COLUMN) {
                    finalOffsets[0] += relativeOffset
                    const finalRowBeforeWrap = finalOffsets[0]
                    if (finalRowBeforeWrap >= height) {
                        finalOffsets[0] = finalRowBeforeWrap % height
                        finalOffsets[1] += Math.floor(finalRowBeforeWrap / height)
                    }
                }

                newOffsetsList.push(finalOffsets)
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

function cellSelectable(state: PlacementState, id: CellIdentifier, isSource: boolean) {
    const cell = getCell(state, id)
    if (isSource) {
        return cell.sample !== null && !cell.placedAt
    } else {
        return cell.sample === null && cell.placedFrom
    }
}

function placeCellsHelper(state: Draft<PlacementState>, sources: Draft<CellState>[], destination: Draft<CellWithParentState>, placementOptions: PlacementOptions) {
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

function getPlacementOption(state: PlacementState): PlacementOptions {
    return state.placementType === PlacementType.PATTERN
        ? { type: PlacementType.PATTERN }
        : { type: PlacementType.GROUP, direction: state.placementDirection }
}

function clickCellHelper(state: Draft<PlacementState>, clickedLocation: MouseOnCellPayload) {
    const sourceContainerName = clickedLocation.context.source
    const isSource = clickedLocation.parentContainerName === sourceContainerName

    if (cellSelectable(state, clickedLocation, isSource)) {
        const clickedCell = getCell(state, clickedLocation)
        clickedCell.selected = !clickedCell.selected
    }

    if (!isSource && sourceContainerName !== undefined) {
        const sourceContainer = getContainer(state, { name: sourceContainerName })
        const destCell = getCellWithParent(state, clickedLocation)
        placeCellsHelper(state, sourceContainer.cells.filter((c) => c.selected), destCell, getPlacementOption(state))
    }
}

function setPreviews(state: Draft<PlacementState>, onMouseLocation: MouseOnCellPayload, preview: boolean) {
    if (onMouseLocation.context.source !== undefined) {
        const activeSelections = getContainer(state, { name: onMouseLocation.context.source}).cells.filter((c) => c.selected)
        const destCell = getCellWithParent(state, onMouseLocation)
        const destinationLocations = placementDestinationLocations(state, activeSelections, destCell, getPlacementOption(state))
        destinationLocations.forEach((location) => {
            getCell(state, location).preview = preview
        })
    }
}

function selectMultipleCells(cells: Draft<CellState>[], forcedSelectedValue?: boolean) {
    const allSelected = !cells.find((c) => !c.selected)
    cells.forEach((cell) => {
        cell.selected = forcedSelectedValue ?? !allSelected
    })
}

function multiSelectHelper(state: Draft<PlacementState>, payload: MultiSelectPayload) {
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

