import { Draft, PayloadAction, createSlice } from "@reduxjs/toolkit"
import { Container, Sample } from "../../models/frontend_models"
import { CoordinateSpec } from "../../models/fms_api_models"

type ContainerIdentifier = Container['name']

export interface CellIdentifier {
    parentContainer: ContainerIdentifier
    coordinates: string
}

export interface CellState {
    preview: boolean
    selected: boolean
    sample: Sample['id'] | null
    fromCell?: CellIdentifier
    toCell?: CellIdentifier
}

export interface PlacementContainerState {
    spec: CoordinateSpec
    cells: Record<string, CellState | undefined>
}

export interface PlacementState {
    parentContainers: Record<ContainerIdentifier, PlacementContainerState | undefined>
    activeSelections: CellIdentifier[]
    errors?: string
}

export interface LoadSamplesAndContainersPayload {
    parentContainers: {
        name: ContainerIdentifier
        spec: CoordinateSpec
        containers: {
            coordinates: string
            sample: Sample['id']
        }[]
    }[]
}

export interface MouseOnCellPayload extends CellIdentifier {
    placementType?: 'group' | 'pattern'
    placementDirection?: 'row' | 'column'
}

export function createEmptyCells(spec: CoordinateSpec) {
    const cells: PlacementContainerState['cells'] = {}
    for (const row of spec[0] ?? ['']) {
        for (const col of spec[1] ?? ['']) {
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

function getContainerAndCell(state: Draft<PlacementState>, location: CellIdentifier) {
    const container = state.parentContainers[location.parentContainer]
    if (!container) {
        throw new Error(`Invalid container: "${location.parentContainer}"`)
    }
    const cell = container.cells[location.coordinates]
    if (!cell) {
        throw new Error(`Invalid coordinate: "${atLocation(location)}"`)
    }

    return [container, cell] as const
}

function placeCell(state: Draft<PlacementState>, sourceLocation: CellIdentifier, destinationLocation: CellIdentifier) {
    const [sourceContainer, sourceCell] = getContainerAndCell(state, sourceLocation)
    if (!sourceContainer || !sourceCell) {
        return state
    }
    if (!sourceCell.sample) {
        throw new Error(`Container at "${atLocation(sourceLocation)}" has no sample`)
    }
    if (sourceCell.fromCell || sourceCell.toCell) {
        throw new Error(`Cannot place sample from ${atLocation(sourceLocation)}`)
    }

    const [destinationContainer, destinationCell] = getContainerAndCell(state, destinationLocation)
    if (!destinationContainer || !destinationCell) {
        return state
    }
    if (destinationCell.sample !== null) {
        throw new Error(`Container at ${atLocation(destinationLocation)} already contains sample`)
    }
    if (destinationCell.fromCell || destinationCell.toCell) {
        throw new Error(`Cannot place sample at ${atLocation(destinationLocation)}`)
    }

    sourceCell.toCell = destinationLocation
    destinationCell.fromCell = sourceLocation

    return state
}

function coordinatesToOffsets(spec: CoordinateSpec, coordinates: string) {
    const offsets: number[] = []
    const originalCoordinates = coordinates
    for (const axis of spec) {
        if (coordinates.length === 0) {
            throw new Error(`Cannot convert coordinates ${originalCoordinates} with spec ${JSON.stringify(spec)} to offsets`)
        }
        const offset = axis.findIndex((coordinate) => coordinates.startsWith(coordinate))
        offsets.push(offset)
        coordinates = coordinates.slice(axis[offset].length)
    }

    return offsets
}

function offsetsToCoordinates(offsets: number[], spec: CoordinateSpec) {
    if (spec.length !== offsets.length) {
        throw new Error(`Cannot convert offsets ${JSON.stringify(offsets)} to coordinates with spec ${JSON.stringify(spec)}`)
    }
    
    const coordinates: string[] = []
    for (let i = 0; i < spec.length; i++) {
        coordinates.push(spec[i][offsets[i]])
    }
    return coordinates.join()
}

function placementDestinationCoordinates(state: PlacementState, sources: CellIdentifier[], destination: CellIdentifier) {
    const sourceOffsetsList = sources.map((source) => {
        const parentContainer = state.parentContainers[source.parentContainer]
        if (parentContainer) {
            return coordinatesToOffsets(parentContainer.spec, source.coordinates)
        } else {
            throw new Error(`Could not find source container at ${atLocation(source)}`)
        }
    })

    const destinationContainer = state.parentContainers[destination.parentContainer]
    if (!destinationContainer) {
        throw new Error(`Could not find destination container at ${atLocation(destination)}`)
    }
    const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, destination.coordinates)

    const newOffsetsList: typeof sourceOffsetsList = []
    for (const sourceOffsets of sourceOffsetsList) {
        const newSourceOffsets: typeof sourceOffsets = []
        for (let index = 0; index < destinationContainer.spec.length; index++) {
            newSourceOffsets.push(sourceOffsets[index] + destinationStartingOffsets[index])
        }
        newOffsetsList.push(newSourceOffsets)
    }

    return newOffsetsList.map((offsets) => offsetsToCoordinates(offsets, destinationContainer.spec))
}

export const initialState: PlacementState = {
    parentContainers: {},
    activeSelections: [],
}

const slice = createSlice({
    name: 'PLACEMENT',
    initialState,
    reducers: {
        loadSamplesAndContainers(state, action: PayloadAction<LoadSamplesAndContainersPayload>) {
            const parentContainers = action.payload.parentContainers
            for (const parentContainer of parentContainers) {
                // initialize container state
                const parentContainerState: PlacementContainerState = {
                    cells: {},
                    spec: parentContainer.spec
                }
                state.parentContainers[parentContainer.name] = parentContainerState

                parentContainerState.cells = createEmptyCells(parentContainer.spec)

                // populate cells
                for (const container of parentContainer.containers) {
                    parentContainerState.cells[container.coordinates] = {
                        sample: container.sample,
                        preview: false,
                        selected: false
                    }
                }
            }
            return state
        },
        clickCell(state, action: PayloadAction<MouseOnCellPayload>) {
            const { parentContainer, coordinates: coordinate, placementType = 'group', placementDirection = 'row' } = action.payload
            
            const [clickedContainer, clickedCell] = getContainerAndCell(state, { parentContainer, coordinates: coordinate })
            if (!clickedContainer || !clickedCell) {
                return state
            }
        }
    }
})

export const { loadSamplesAndContainers } = slice.actions
export default slice.reducer
