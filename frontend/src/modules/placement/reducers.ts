import { Draft, PayloadAction, createSlice, original } from "@reduxjs/toolkit"
import { Container, Sample } from "../../models/frontend_models"
import { CoordinateAxis, CoordinateSpec, FMSId } from "../../models/fms_api_models"

export interface PlacementPatternOptions {
    type: 'pattern'
}

export const PlacementDirections = {
    row: 'row',
    column: 'column'
} as const
export interface PlacementGroupOptions {
    type: 'group'
    direction: keyof typeof PlacementDirections
}

export type PlacementOptions = PlacementPatternOptions | PlacementGroupOptions

interface ContainerIdentifier {
    parentContainer: Container['name']
}

export interface CellIdentifier extends ContainerIdentifier {
    coordinates: string
}

export interface CellState {
    preview: boolean
    selected: boolean
    sample: Sample['id'] | null
    placedFrom: null | CellIdentifier
    placedAt: null | CellIdentifier
}

export interface PlacementContainerState {
    type: 'source' | 'destination'
    name: string
    spec: CoordinateSpec
    barcode: string
    kind: string
    cells: Record<CellIdentifier['coordinates'], undefined | CellState>
}

export interface PlacementState {
    parentContainers: Record<ContainerIdentifier['parentContainer'], PlacementContainerState | undefined>
    error?: string
}

export type LoadContainersPayload = {
    type: PlacementContainerState['type']
    name: PlacementContainerState['name']
    barcode: string
    kind: PlacementContainerState['kind']
    spec: PlacementContainerState['spec']
    containers: {
        coordinates: string
        sample: Sample['id']
    }[]
}[]

export interface MouseOnCellPayload extends CellIdentifier {
    placementOptions: PlacementOptions
}

export type MultiSelectPayload = {
    parentContainer: string
    forcedSelectedValue?: boolean
} & ({
    type: 'row'
    row: number
} | {
    type: 'column'
    column: number
} | {
    type: 'all'
} | {
    type: 'sample-ids' // also checks cell.placedFrom
    sampleIDs: Array<Sample['id']>
} | {
    type: 'coordinates'
    coordinatesList: string[]
})

export interface PlaceAllSourcePayload {
    source: ContainerIdentifier['parentContainer']
    destination: ContainerIdentifier['parentContainer']
}

function createEmptyCells(spec: CoordinateSpec) {
    const cells: PlacementContainerState['cells'] = {}
    const [axisRow = [''], axisColumn = ['']] = spec
    for (const row of axisRow) {
        for (const col of axisColumn) {
            const coordinates = row + col
            cells[coordinates] = {
                sample: null,
                preview: false,
                selected: false,
                placedAt: null,
                placedFrom: null,
            }
        }
    }

    return cells
}

export function atLocations(...ids: CellIdentifier[]) {
    return ids.map((id) => `${id.coordinates}@${id.parentContainer}`).join(',') 
}

function getContainer(state: Draft<PlacementState>, location: ContainerIdentifier) {
    const container = state.parentContainers[location.parentContainer]
    if (!container) {
        throw new Error(`Container not loaded: "${location.parentContainer}"`)
    }
    return container
}

function getCell(state: Draft<PlacementState>, location: CellIdentifier) {
    const container = getContainer(state, location)
    const cell = container.cells[location.coordinates]
    if (!cell) {
        throw new Error(`Invalid coordinate: "${atLocations(location)}"`)
    }
    return cell
}

function placeCell(state: Draft<PlacementState>, sourceLocation: CellIdentifier, destinationLocation: CellIdentifier) {
    if (getContainer(state, sourceLocation).type !== 'source') {
        throw new Error(`Container '${sourceLocation.parentContainer}' is not a source container`)
    }
    const sourceCell = getCell(state, sourceLocation)
    if (!sourceCell.sample) {
        throw new Error(`Source container at "${atLocations(sourceLocation)}" has no sample`)
    }
    if (sourceCell.placedAt) {
        throw new Error(`Source sample from ${atLocations(sourceLocation)} already placed (at ${atLocations(sourceCell.placedAt)})`)
    }

    if (getContainer(state, destinationLocation).type !== 'destination') {
        throw new Error(`Container '${destinationLocation.parentContainer}' is not a destination container`)
    }
    const destinationCell = getCell(state, destinationLocation)
    if (destinationCell.sample === null && destinationCell.placedFrom) {
        throw new Error(`Destination container at ${atLocations(destinationLocation)} already contains a sample from ${atLocations(destinationCell.placedFrom)}`)
    }
    if (destinationCell.sample !== null) {
        throw new Error(`Destination container at ${atLocations(destinationLocation)} already contains a sample that has not been placed elsewhere`)
    }

    sourceCell.placedAt = destinationLocation
    destinationCell.placedFrom = sourceLocation
}

function coordinatesToOffsets(spec: CoordinateSpec, coordinates: string) {
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

function offsetsToCoordinates(offsets: readonly number[], spec: CoordinateSpec) {
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

function placementDestinationLocations(state: PlacementState, sources: CellIdentifier[], destination: CellIdentifier, placementOptions: PlacementOptions): CellIdentifier[] {
    if (sources.length == 0) {
        return []
    }

    const newOffsetsList: number[][] = []

    const destinationContainer = getContainer(state, destination)
    const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, destination.coordinates)

    switch (placementOptions.type) {
        case 'pattern': {
            const sourceContainerNames = new Set(sources.map((s) => s.parentContainer))
            if (sourceContainerNames.size > 1) {
                throw new Error('Cannot use pattern placement type with more than one source container')
            }

            const sourceOffsetsList = sources.map((source) => {
                const parentContainer = getContainer(state, source)
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
        case 'group': {
            // it is possible to place samples from multiple containers in one shot

            // sort source location indices by sample id
            const sourceIndices = [...sources.keys()].sort((indexA, indexB) => {
                const a = sources[indexA]
                const b = sources[indexB]
                const sampleA = getCell(state, a).sample
                const sampleB = getCell(state, b).sample
                if (sampleA === null) {
                    throw new Error(`Cell at coordinates ${atLocations(a)} has no sample`)
                }
                if (sampleB === null) {
                    throw new Error(`Cell at coordinates ${atLocations(b)} has no sample`)
                }
                return sampleA - sampleB
            })

            newOffsetsList.push(
                ...sourceIndices.map(
                    (index) => destinationStartingOffsets.map(
                        (offset, axis) => offset + (placementOptions.direction === 'row' && axis == 1 ? index : 0) + (placementOptions.direction === 'column' && axis == 0 ? index : 0)
                    )
                )
            )
        }
    }

    return newOffsetsList.map((offsets) => ({ parentContainer: destination.parentContainer, coordinates: offsetsToCoordinates(offsets, destinationContainer.spec) }))
}

function findSelections(state: PlacementState, filter: (container: PlacementContainerState, cell: CellState) => boolean) {
    const ids: CellIdentifier[] = []
    for (const parentContainer in state.parentContainers) {
        const container = getContainer(state, { parentContainer })
        for (const coordinates in container.cells) {
            const id = { parentContainer, coordinates }
            const cell = getCell(state, id)
            if (filter(container, cell) && cell.selected)
                ids.push(id)
        }
    }
    return ids
}

function findSelectionsInSourceContainers(state: PlacementState) {
    return findSelections(state, (container) => container.type === 'source')
}

function cellSelectable(state: PlacementState, id: CellIdentifier) {
    const container = getContainer(state, id)
    const cell = getCell(state, id)
    if (container.type === 'source') {
        return cell.sample !== null && !cell.placedAt
    }
    if (container.type === 'destination') {
        return cell.sample === null && cell.placedFrom
    }
    return false
}

function placeCellsHelper(state: Draft<PlacementState>, sources: CellIdentifier[], destination: CellIdentifier, placementOptions: PlacementOptions) {
    if (sources.length > 0) {
        // relying on placeCell to do error checking

        const destinationLocations = placementDestinationLocations(state, sources, destination, placementOptions)
        sources.forEach((_, index) => {
            placeCell(state, sources[index], destinationLocations[index])
            getCell(state, sources[index]).selected = false
        })

        destinationLocations.forEach((location) => {
            getCell(state, location).preview = false
        })
    }

    return state
}

function clickCellHelper(state: Draft<PlacementState>, clickedLocation: MouseOnCellPayload) {

    if (cellSelectable(state, clickedLocation)) {
        const clickedCell = getCell(state, clickedLocation)
        clickedCell.selected = !clickedCell.selected
    }

    if (getContainer(state, clickedLocation).type === 'destination')
        placeCellsHelper(state, findSelectionsInSourceContainers(state), clickedLocation, clickedLocation.placementOptions)

    return state
}

function setPreviews(state: Draft<PlacementState>, onMouseLocation: MouseOnCellPayload, preview: boolean) {
    const activeSelections = findSelectionsInSourceContainers(state)
    const destinationLocations = placementDestinationLocations(state, activeSelections, onMouseLocation, onMouseLocation.placementOptions)
    activeSelections.forEach((_, index) => {
        getCell(state, destinationLocations[index]).preview = preview
    })

    return state
}

function selectMultipleCells(cells: Draft<CellState>[], forcedSelectedValue?: boolean) {
    const allSelected = !cells.find((c) => !c.selected)
    cells.forEach((cell) => {
        cell.selected = forcedSelectedValue ?? !allSelected
    })
}

function multiSelectHelper(state: Draft<PlacementState>, payload: MultiSelectPayload) {
    const container = getContainer(state, payload)

    if (payload.type === 'sample-ids') {
        const sampleIDs = new Set(payload.sampleIDs)
        const cells = Object.values(container.cells).reduce((cells, cell) => {
            if (!cell) return cells

            let sample = cell?.sample
            if (cell?.placedFrom) {
                sample = getCell(state, cell.placedFrom).sample
            }
            if (sample && sampleIDs.has(sample)) {
                cells.push(cell)
            }
            return cells
        }, [] as Draft<CellState>[])
        selectMultipleCells(cells, payload.forcedSelectedValue)
        return state
    }

    if (payload.type === 'coordinates') {
        selectMultipleCells(payload.coordinatesList.map((coordinates) => getCell(state, { parentContainer: payload.parentContainer, coordinates })), payload.forcedSelectedValue)
        return state
    }

    const [rowAxis = [''], colAxis = ['']] = container.spec
    const rowSize = rowAxis.length
    const colSize = colAxis.length

    const offsets: number[][] = []
    switch (payload.type) {
        case 'row': {
            if (!(0 <= payload.row && payload.row < rowSize)) {
                throw new Error(`Row ${payload.row} is not within the range of [0, ${rowSize})`)
            }
            for (let col = 0; col < colSize; col++) {
                offsets.push([payload.row, col])
            }
            break
        }
        case 'column': {
            if (!(0 <= payload.column && payload.column < colSize)) {
                throw new Error(`Column ${payload.column} is not within the range of [0, ${colSize})`)
            }
            for (let row = 0; row < rowSize; row++) {
                offsets.push([row, payload.column])
            }
            break
        }
        case 'all': {
            for (let row = 0; row < rowSize; row++) {
                for (let col = 0; col < colSize; col++) {
                    offsets.push([row, col])
                }
            }
            break
        }
    }

    const cells = offsets
        .map((offsets) => ({
            parentContainer: payload.parentContainer,
            coordinates: offsetsToCoordinates(offsets, container.spec)
        }))
        .filter((id) => cellSelectable(state, id))
        .map((id) => getCell(state, id))
    selectMultipleCells(cells, payload.forcedSelectedValue)

    return state
}

const initialState: PlacementState = {
    parentContainers: {},
} as const

function reducerWithThrows<P>(func: (state: Draft<PlacementState>, action: P) => PlacementState) {
    return (state: Draft<PlacementState>, action: PayloadAction<P>) => {
        try {
            return func(state, action.payload)
        } catch (error) {
            const originalState = original(state) ?? initialState
            return {
                ...originalState,
                error: error.message
            } as PlacementState
        }
    }
}

const slice = createSlice({
    name: 'PLACEMENT',
    initialState,
    reducers: {
        loadContainers(state, action: PayloadAction<LoadContainersPayload>) {
            const parentContainersPayload = action.payload
            for (const parentContainerPayload of parentContainersPayload) {
                // initialize container state
                const parentContainerState: PlacementContainerState = {
                    cells: state.parentContainers[parentContainerPayload.name]?.cells ?? createEmptyCells(parentContainerPayload.spec),
                    type: parentContainerPayload.type,
                    name: parentContainerPayload.name,
                    barcode: parentContainerPayload.barcode,
                    kind: parentContainerPayload.kind,
                    spec: parentContainerPayload.spec,
                }

                state.parentContainers[parentContainerPayload.name] = parentContainerState

                // populate cells
                // remove sample in cells that don't have sample and also other cells in other containers that
                // depend on the cell
                for (const container of parentContainerPayload.containers) {
                    const cell = parentContainerState.cells[container.coordinates]
                    if (cell?.sample !== container.sample) {
                        parentContainerState.cells[container.coordinates] = {
                            sample: container.sample,
                            preview: false,
                            selected: false,
                            placedFrom: null,
                            placedAt: null,
                        }
                    }
                }
            }
            return state
        },
        clickCell: reducerWithThrows(clickCellHelper),
        placeAllSource: reducerWithThrows((state, payload: PlaceAllSourcePayload) => {
            // checking container existence
            const sourceContainer = getContainer(state, { parentContainer: payload.source })
            const [axisRow = '', axisCol = ''] = getContainer(state, { parentContainer: payload.destination }).spec

            const sourceIDs = Object.entries(sourceContainer.cells).reduce((ids, [coordinates, cell]) => {
                if (cell && cell.sample && !cell.placedAt) {
                    ids.push({
                        parentContainer: payload.source,
                        coordinates,
                    })
                }
                return ids
            }, [] as CellIdentifier[])
            return placeCellsHelper(state, sourceIDs, {
                parentContainer: payload.destination,
                coordinates: axisRow[0] + axisCol[0]
            }, {
                type: 'pattern'
            })
        }),
        multiSelect: reducerWithThrows(multiSelectHelper),
        onCellEnter: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getContainer(state, payload)
            if (container.type === 'destination') setPreviews(state, payload, true)
            return state
        }),
        onCellExit: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getContainer(state, payload)
            if (container.type === 'destination') setPreviews(state, payload, false)
            return state
        }),
        undoSelectedSamples: reducerWithThrows((state, parentContainer: Container['name']) => {
            let cells = findSelections(state, (container) => container.name === parentContainer).map((id) => getCell(state, id))
            if (cells.length === 0) {
                cells = Object.values(getContainer(state, { parentContainer }).cells).reduce((cells, cell) => {
                    if (cell) {
                        cells.push(cell)
                    }
                    return cells
                }, [] as Draft<CellState>[])
            }
            for (const cell of cells) {
                if (!cell.placedFrom) continue
                const sourceCell = getCell(state, cell.placedFrom)
                cell.placedFrom = null
                cell.selected = false
                sourceCell.placedAt = null
            }
            return state
        }),
        flushContainers(state, action: PayloadAction<undefined | Array<Container['name']>>) {
            const containerNames = action.payload ? action.payload : Object.keys(state.parentContainers)
            containerNames.forEach((deletedContainerName) => {
                delete state.parentContainers[deletedContainerName]

                // undo placements from and to deleted container
                Object.values(state.parentContainers).forEach((parentContainer) => {
                    if (!parentContainer) return
                    Object.values(parentContainer.cells).forEach((cell) => {
                        if (!cell) return
                        if (cell.placedFrom?.parentContainer === deletedContainerName)
                            cell.placedFrom = null
                        if (cell.placedAt?.parentContainer === deletedContainerName)
                            cell.placedAt = null
                    })
                })
            })
            return state
        }
    }
})

export const {
    loadContainers,
    clickCell,
    placeAllSource,
    onCellEnter,
    onCellExit,
    multiSelect,
    undoSelectedSamples,
    flushContainers,
} = slice.actions
export const internals = {
    initialState,
    createEmptyCells,
    coordinatesToOffsets,
    offsetsToCoordinates,
    placementDestinationLocations,
    findSelections,
    clickCellHelper,
    setPreviews,
    multiSelectHelper,
}
export default slice.reducer
