import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { Container, Sample } from "../../models/frontend_models"
import { CoordinateSpec } from "../../models/fms_api_models"

type ContainerIdentifier = Container['name']

export interface CellIdentifier {
    parentContainer: ContainerIdentifier
    coordinate: string
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
    error?: string
}

export interface LoadSamplesAndContainersPayload {
    parentContainers: {
        name: ContainerIdentifier
        spec: CoordinateSpec
        containers: {
            coordinate: string
            sample: Sample['id']
        }[]
    }[]
}

export interface MouseOnCellPayload extends CellIdentifier {
    placementType?: 'group' | 'pattern'
    placementDirection?: 'row' | 'column'
}

interface PlaceCellPayload {
    placedOutLocation: CellIdentifier
    placedInLocation: CellIdentifier
}

export function createEmptyCells(spec: CoordinateSpec) {
    const cells: PlacementContainerState['cells'] = {}
    for (const row of spec[0] ?? []) {
        for (const col of spec[1] ?? []) {
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
    return `${id.coordinate}@${id.parentContainer}`
}

function placementCoordinates(sources: CellIdentifier[], destination: CellIdentifier): CellIdentifier[] {
    
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
                    parentContainerState.cells[container.coordinate] = {
                        sample: container.sample,
                        preview: false,
                        selected: false
                    }
                }
            }
            return state
        },
        placeCell(state, action: PayloadAction<PlaceCellPayload>) {
            const { placedOutLocation, placedInLocation } = action.payload

            const sourceContainer = state.parentContainers[placedOutLocation.parentContainer]
            if (!sourceContainer) {
                state.error = `Invalid source parent container: "${placedOutLocation.parentContainer}"`
                return state
            }
            const placedOutCell = sourceContainer.cells[placedOutLocation.coordinate]
            if (!placedOutCell) {
                state.error = `Invalid coordinate: "${atLocation(placedOutLocation)}"`
                return state
            }
            if (!placedOutCell.sample) {
                state.error = `Container at "${atLocation(placedOutLocation)}" has no sample`
                return state
            }
            if (placedOutCell.fromCell || placedOutCell.toCell) {
                state.error = `Cannot place sample at ${atLocation(placedOutLocation)}`
                return state
            }

            const destinationContainer = state.parentContainers[placedInLocation.parentContainer]
            if (!destinationContainer) {
                state.error = `Invalid destination parent container: "${placedInLocation.parentContainer}"`
                return state
            }
            const placedInCell = destinationContainer.cells[placedInLocation.coordinate]
            if (!placedInCell) {
                state.error = `Invalid coordinate: "${atLocation(placedInLocation)}"`
                return state
            }
            if (placedInCell.sample !== null) {
                state.error = `Container at ${atLocation(placedInLocation)} already contains sample`
                return state
            }
            if (placedInCell.fromCell || placedInCell.toCell) {
                state.error = `Cannot place sample at ${atLocation(placedInLocation)}`
                return state
            }

            placedOutCell.toCell = placedInLocation
            placedInCell.fromCell = placedOutLocation

            return state
        },
        clickCell(state, action: PayloadAction<MouseOnCellPayload>) {
            const { parentContainer, coordinate, placementType = 'group', placementDirection = 'row' } = action.payload
            
            const container = state.parentContainers[parentContainer]
            if (!container) {
                state.error = `Invalid source parent container: "${parentContainer}"`
                return state
            }
            const placedOutCell = container.cells[coordinate]
            if (!placedOutCell) {
                state.error = `Invalid coordinate: "${atLocation({ parentContainer, coordinate })}"`
                return state
            }

            
        }
    }
})

export const { loadSamplesAndContainers } = slice.actions
export default slice.reducer
