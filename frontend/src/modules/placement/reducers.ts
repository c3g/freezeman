import { Draft, PayloadAction, createSlice, original } from "@reduxjs/toolkit"
import { Container, Sample } from "../../models/frontend_models"
import { CoordinateAxis, CoordinateSpec, FMSId } from "../../models/fms_api_models"

type ContainerIdentifier = Container['name']

export interface CellIdentifier {
    parentContainer: ContainerIdentifier
    coordinates: string
}

export interface CellState {
    preview: boolean
    selected: boolean
    sample: Sample['id'] | null
    samplePlacedFrom: null | CellIdentifier
    samplePlacedAt: null | CellIdentifier
}

export interface PlacementContainerState {
    type: 'source' | 'destination'
    spec: CoordinateSpec
    cells: Record<string, CellState | undefined>
    barcode?: string
    kind?: string
}

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

export interface PlacementState {
    parentContainers: Record<ContainerIdentifier, PlacementContainerState | undefined>
    placementOptions: PlacementOptions
    error?: string
}

export type LoadContainersPayload = {
    type: PlacementContainerState['type']
    name: ContainerIdentifier
    barcode?: string
    kind?: PlacementContainerState['kind']
    spec: PlacementContainerState['spec']
    containers: {
        coordinates: string
        sample: Sample['id']
    }[]
}[]

export interface MouseOnCellPayload extends CellIdentifier {}

export type MultiSelectPayload = {
    container: string
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
    type: 'sample-ids' // also checks cell.samplePlacedFrom
    sampleIDs: Array<Sample['id']>
} | {
    type: 'coordinates'
    coordinatesList: string[]
})

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
                samplePlacedAt: null,
                samplePlacedFrom: null,
            }
        }
    }

    return cells
}

function atLocation(id: CellIdentifier) {
    return `${id.coordinates}@${id.parentContainer}`
}

function getContainer(state: Draft<PlacementState>, containerName: string) {
    const container = state.parentContainers[containerName]
    if (!container) {
        throw new Error(`Container not loaded: "${containerName}"`)
    }
    return container
}

function getCell(state: Draft<PlacementState>, location: CellIdentifier) {
    const container = getContainer(state, location.parentContainer)
    const cell = container.cells[location.coordinates]
    if (!cell) {
        throw new Error(`Invalid coordinate: "${atLocation(location)}"`)
    }
    return cell
}

function placeCell(state: Draft<PlacementState>, sourceLocation: CellIdentifier, destinationLocation: CellIdentifier) {
    if (getContainer(state, sourceLocation.parentContainer).type !== 'source') {
        throw new Error(`Container '${sourceLocation.parentContainer}' is not a source container`)
    }
    const sourceCell = getCell(state, sourceLocation)
    if (!sourceCell.sample) {
        throw new Error(`Source container at "${atLocation(sourceLocation)}" has no sample`)
    }
    if (sourceCell.samplePlacedAt) {
        throw new Error(`Source sample from ${atLocation(sourceLocation)} already placed (at ${atLocation(sourceCell.samplePlacedAt)})`)
    }

    if (getContainer(state, destinationLocation.parentContainer).type !== 'destination') {
        throw new Error(`Container '${destinationLocation.parentContainer}' is not a destination container`)
    }
    const destinationCell = getCell(state, destinationLocation)
    if (destinationCell.sample === null && destinationCell.samplePlacedFrom) {
        throw new Error(`Destination container at ${atLocation(destinationLocation)} already contains a sample from ${atLocation(destinationCell.samplePlacedFrom)}`)
    }
    if (destinationCell.sample !== null) {
        throw new Error(`Destination container at ${atLocation(destinationLocation)} already contains a sample that has not been placed elsewhere`)
    }

    sourceCell.samplePlacedAt = destinationLocation
    destinationCell.samplePlacedFrom = sourceLocation
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

    const destinationContainer = getContainer(state, destination.parentContainer)
    const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, destination.coordinates)

    switch (placementOptions.type) {
        case 'pattern': {
            const sourceContainerNames = new Set(sources.map((s) => s.parentContainer))
            if (sourceContainerNames.size > 1) {
                throw new Error('Cannot use pattern placement type with more than one source container')
            }

            const sourceOffsetsList = sources.map((source) => {
                const parentContainer = getContainer(state, source.parentContainer)
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
                    throw new Error(`Cell at coordinates ${atLocation(a)} has no sample`)
                }
                if (sampleB === null) {
                    throw new Error(`Cell at coordinates ${atLocation(b)} has no sample`)
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

function getActiveSelections(state: PlacementState, type?: PlacementContainerState['type']) {
    const ids: CellIdentifier[] = []
    for (const parentContainer in state.parentContainers) {
        const container = getContainer(state, parentContainer)
        if (type && container.type !== type) continue

        for (const coordinates in container.cells) {
            const id = { parentContainer, coordinates }
            if (getCell(state, id).selected)
                ids.push(id)
        }
    }
    return ids
}

function cellSelectable(state: PlacementState, id: CellIdentifier) {
    const container = getContainer(state, id.parentContainer)
    const cell = getCell(state, id)
    if (container.type === 'source') {
        return cell.sample !== null && cell.samplePlacedAt === null
    }
    if (container.type === 'destination') {
        return cell.sample === null && cell.samplePlacedFrom !== null
    }
    return false
}

function clickCellHelper(state: Draft<PlacementState>, clickedLocation: MouseOnCellPayload) {
    
    if (cellSelectable(state, clickedLocation)) {
        const clickedCell = getCell(state, clickedLocation)
        clickedCell.selected = !clickedCell.selected
        return state
    }
    
    // from this point on we assume the container is a destination
    if (getContainer(state, clickedLocation.parentContainer).type !== 'destination') return state

    const activeSelections = getActiveSelections(state, 'source')

    if (activeSelections.length > 0) {
        // relying on placeCell to do error checking

        const destinationLocations = placementDestinationLocations(state, activeSelections, clickedLocation, state.placementOptions)
        activeSelections.forEach((_, index) => {
            placeCell(state, activeSelections[index], destinationLocations[index])
            getCell(state, activeSelections[index]).selected = false
        })

        destinationLocations.forEach((location) => {
            getCell(state, location).preview = false
        })
    }

    return state
}

function setPreviews(state: Draft<PlacementState>, onMouseLocation: MouseOnCellPayload, preview: boolean) {
    const activeSelections = getActiveSelections(state, 'source')
    const destinationLocations = placementDestinationLocations(state, activeSelections, onMouseLocation, state.placementOptions)
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
    const container = getContainer(state, payload.container)

    if (payload.type === 'sample-ids') {
        const sampleIDs = new Set(payload.sampleIDs)
        const cells = Object.values(container.cells).reduce((cells, cell) => {
            if (!cell) return cells

            let sample = cell?.sample
            if (cell?.samplePlacedFrom) {
                sample = getCell(state, cell.samplePlacedFrom).sample
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
        selectMultipleCells(payload.coordinatesList.map((coordinates) => getCell(state, { parentContainer: payload.container, coordinates })), payload.forcedSelectedValue)
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
            parentContainer: payload.container,
            coordinates: offsetsToCoordinates(offsets, container.spec)
        }))
        .filter((id) => cellSelectable(state, id))
        .map((id) => getCell(state, id))
    selectMultipleCells(cells, payload.forcedSelectedValue)

    return state
}

const initialPlacementOptions: PlacementOptions = { type: 'group', direction: 'row' } as const
const initialState: PlacementState = {
    parentContainers: {},
    placementOptions: initialPlacementOptions
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
            const parentContainers = action.payload
            for (const parentContainer of parentContainers) {
                // initialize container state
                const parentContainerState: PlacementContainerState = {
                    type: parentContainer.type,
                    barcode: parentContainer.barcode,
                    kind: parentContainer.kind,
                    cells: createEmptyCells(parentContainer.spec),
                    spec: parentContainer.spec,
                    ...state.parentContainers[parentContainer.name]
                }
                state.parentContainers[parentContainer.name] = parentContainerState

                // populate cells
                for (const container of parentContainer.containers) {
                    const cell = parentContainerState.cells[container.coordinates]
                    if (cell?.sample !== container.sample) {
                        parentContainerState.cells[container.coordinates] = {
                            sample: container.sample,
                            preview: false,
                            selected: false,
                            samplePlacedFrom: null,
                            samplePlacedAt: null,
                        }
                    }
                }
            }
            return state
        },
        clickCell: reducerWithThrows(clickCellHelper),
        multiSelect: reducerWithThrows(multiSelectHelper),
        onCellEnter: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getContainer(state, payload.parentContainer)
            if (container.type === 'destination') setPreviews(state, payload, true)
            return state
        }),
        onCellExit: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getContainer(state, payload.parentContainer)
            if (container.type === 'destination') setPreviews(state, payload, false)
            return state
        }),
        setPlacementType(state, action: PayloadAction<PlacementOptions['type']>) {
            if (action.payload === 'group') {
                state.placementOptions = {
                    type: 'group',
                    direction: state.placementOptions.type === 'group'
                        ? state.placementOptions.direction
                        : initialPlacementOptions.direction
                }
            } else {
                state.placementOptions.type = 'pattern'
            }
        },
        setPlacementDirection: reducerWithThrows((state, payload: PlacementGroupOptions['direction']) => {
            if (state.placementOptions.type !== 'group') {
                throw new Error('Placement direction can only be set for placement of type "group"')
            }
            state.placementOptions.direction = payload
            return state
        }),
        flushContainers(state, action: PayloadAction<string[]>) {
            action.payload.forEach((container) => {
                delete state.parentContainers[container]
            })
            return state
        }
    }
})

export const {
    loadContainers,
    clickCell,
    onCellEnter,
    onCellExit,
    multiSelect,
    setPlacementType,
    setPlacementDirection,
    flushContainers,
} = slice.actions
export const internals = {
    initialState,
    createEmptyCells,
    coordinatesToOffsets,
    offsetsToCoordinates,
    placementDestinationLocations,
    getActiveSelections,
    clickCellHelper,
    setPreviews,
    multiSelectHelper,
}
export default slice.reducer
