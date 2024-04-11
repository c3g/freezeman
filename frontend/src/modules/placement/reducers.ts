import { Draft, PayloadAction, createSlice, original } from "@reduxjs/toolkit"
import { Container, Sample } from "../../models/frontend_models"
import { CoordinateAxis, CoordinateSpec } from "../../models/fms_api_models"

type ContainerIdentifier = Container['name']

export interface CellIdentifier {
    parentContainer: ContainerIdentifier
    coordinates: string
}

export interface CellState {
    preview: boolean
    selected: boolean
    sample: Sample['id'] | null
    samplePlacedFrom?: CellIdentifier
    samplePlacedAt?: CellIdentifier
}

export interface PlacementContainerState {
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
    activeSourceContainer?: ContainerIdentifier
    activeDestinationContainer?: ContainerIdentifier
    error?: string
}

export type LoadContainersPayload = {
    name: ContainerIdentifier
    barcode?: string
    kind?: string
    spec: CoordinateSpec
    containers: {
        coordinates: string
        sample: Sample['id']
    }[]
}[]

export interface MouseOnCellPayload extends CellIdentifier { }

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
    type: 'sample-ids'
    ids: Array<Sample['id']>
})

function createEmptyCells(spec: CoordinateSpec) {
    const cells: PlacementContainerState['cells'] = {}
    const [axisRow = [''], axisColumn = ['']] = spec
    for (const row of axisRow) {
        for (const col of axisColumn) {
            cells[row + col] = {
                sample: null,
                preview: false,
                selected: false,
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
    const sourceCell = getCell(state, sourceLocation)
    if (!sourceCell.sample) {
        throw new Error(`Source container at "${atLocation(sourceLocation)}" has no sample`)
    }
    if (sourceCell.samplePlacedAt) {
        throw new Error(`Source sample from ${atLocation(sourceLocation)} already placed (at ${atLocation(sourceCell.samplePlacedAt)})`)
    }

    const destinationCell = getCell(state, destinationLocation)
    if (destinationCell.sample === null && destinationCell.samplePlacedFrom) {
        throw new Error(`Destination container at ${atLocation(destinationLocation)} already contains a sample from ${destinationCell.samplePlacedFrom}`)
    }
    if (destinationCell.sample !== null && !destinationCell.samplePlacedAt) {
        throw new Error(`Destination container at ${atLocation(destinationLocation)} still contains a sample`)
    }

    sourceCell.samplePlacedAt = destinationLocation
    destinationCell.samplePlacedFrom = sourceLocation
}

function coordinatesToOffsets(spec: CoordinateSpec, coordinates: string) {
    const offsets: number[] = []
    const originalCoordinates = coordinates
    for (const axis of spec) {
        if (coordinates.length === 0) {
            throw new Error(`Cannot convert coordinates ${originalCoordinates} with spec ${JSON.stringify(spec)} to offsets`)
        }
        const offset = axis.findIndex((coordinate) => coordinates.startsWith(coordinate))
        if (offset < 0) {
            throw new Error(`Cannot convert coordinates ${originalCoordinates} with spec ${JSON.stringify(spec)} to offsets`)
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

function getActiveSelections(state: PlacementState, parentContainerName: string) {
    const container = getContainer(state, parentContainerName)

    return Object.entries(container.cells).reduce((ids, [coordinates, cell]) => {
        if (cell?.selected) {
            ids.push({
                parentContainer: parentContainerName,
                coordinates,
            })
        }
        return ids
    }, [] as CellIdentifier[])
}

function cellSelectable(state: Draft<PlacementState>, id: CellIdentifier) {
    const cell = getCell(state, id)
    return (id.parentContainer === state.activeSourceContainer && cell.sample !== null && !cell.samplePlacedAt)
        || (id.parentContainer === state.activeDestinationContainer && !!cell.samplePlacedFrom)
}

function clickCellHelper(state: Draft<PlacementState>, payload: MouseOnCellPayload) {
    const { parentContainer: clickedContainerName, coordinates: coordinate } = payload

    const clickedLocation: CellIdentifier = { parentContainer: clickedContainerName, coordinates: coordinate }
    const clickedCell = getCell(state, clickedLocation)

    if (cellSelectable(state, clickedLocation)) {
        clickedCell.selected = !clickedCell.selected
        return state
    }

    if (clickedContainerName === state.activeDestinationContainer) {
        const sourceContainerName = state.activeSourceContainer
        if (sourceContainerName === undefined) {
            throw new Error('state.activeSourceContainer is undefined')
        }

        const activeSelections = getActiveSelections(state, sourceContainerName)

        if (activeSelections.length > 0) {
            if (clickedContainerName !== state.activeDestinationContainer) {
                throw new Error(`'${clickedContainerName}' is not the current active destination container ('${state.activeDestinationContainer}')`)
            }

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
    }

    return state
}

function setPreviews(state: Draft<PlacementState>, payload: MouseOnCellPayload, preview: boolean) {
    const { parentContainer, coordinates: coordinate } = payload

    if (parentContainer !== state.activeDestinationContainer) {
        // throw new Error(`'${parentContainer}' is not the current active destination container ('${state.activeDestinationContainer}')`)
        return state
    }
    if (state.activeSourceContainer === undefined) {
        throw new Error('state.activeSourceContainer is undefined')
    }

    const onMouseLocation: CellIdentifier = { parentContainer, coordinates: coordinate }

    const activeSelections = getActiveSelections(state, state.activeSourceContainer)
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
        const sampleIDs = new Set(payload.ids)
        const cells = Object.values(container.cells).reduce((cells, c) => {
            if (c?.sample && sampleIDs.has(c?.sample)) {
                cells.push(c)
            }
            return cells
        }, [] as Draft<CellState>[])
        selectMultipleCells(cells, payload.forcedSelectedValue)
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
    selectMultipleCells(cells)

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
        } catch (e) {
            const originalState = original(state) ?? initialState
            return {
                ...originalState,
                error: e.toString()
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
                const parentContainerState = {
                    barcode: parentContainer.barcode,
                    kind: parentContainer.kind,
                    cells: createEmptyCells(parentContainer.spec),
                    spec: parentContainer.spec,
                    ...state.parentContainers[parentContainer.name] // might not be a good idea with WritableDraft...
                }
                state.parentContainers[parentContainer.name] = parentContainerState

                // populate cells
                for (const container of parentContainer.containers) {
                    const cell = parentContainerState.cells[container.coordinates]
                    if (cell?.sample !== container.sample) {
                        parentContainerState.cells[container.coordinates] = {
                            sample: container.sample,
                            preview: false,
                            selected: false
                        }
                    }
                }
            }
            return state
        },
        setActiveSourceContainer: reducerWithThrows((state, containerName: string) => {
            getContainer(state, containerName) // // throws error if container not loaded
            state.activeSourceContainer = containerName
            return state
        }),
        setActiveDestinationContainer: reducerWithThrows((state, containerName: string) => {
            getContainer(state, containerName) // throws error if container not loaded
            state.activeDestinationContainer = containerName
            return state
        }),
        clickCell: reducerWithThrows(clickCellHelper),
        multiSelect: reducerWithThrows(multiSelectHelper),
        onCellEnter: reducerWithThrows((state, payload: MouseOnCellPayload) => setPreviews(state, payload, true)),
        onCellExit: reducerWithThrows((state, payload: MouseOnCellPayload) => setPreviews(state, payload, false)),
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
        })
    }
})

export const {
    loadContainers,
    setActiveSourceContainer,
    setActiveDestinationContainer,
    clickCell,
    onCellEnter,
    onCellExit,
    multiSelect,
    setPlacementType,
    setPlacementDirection,
} = slice.actions
export const internals = {
    initialState,
    createEmptyCells,
    coordinatesToOffsets,
    offsetsToCoordinates,
    placementDestinationLocations,
    clickCellHelper,
    setPreviews,
    multiSelectHelper,
}
export default slice.reducer
