import { Draft, PayloadAction, createSlice } from "@reduxjs/toolkit"
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

function getCell(state: Draft<PlacementState>, location: CellIdentifier) {
    const container = state.parentContainers[location.parentContainer]
    if (!container) {
        state.error = `Invalid container: "${location.parentContainer}"`
        return [] as const
    }
    const cell = container.cells[location.coordinate]
    if (!cell) {
        state.error = `Invalid coordinate: "${atLocation(location)}"`
        return [] as const
    }

    return [container, cell] as const
}

function placeCell(state: Draft<PlacementState>, sourceLocation: CellIdentifier, destinationLocation: CellIdentifier) {
    const [sourceContainer, sourceCell] = getCell(state, sourceLocation)
    if (!sourceContainer || !sourceCell) {
        return state
    }
    if (!sourceCell.sample) {
        state.error = `Container at "${atLocation(sourceLocation)}" has no sample`
        return
    }
    if (sourceCell.fromCell || sourceCell.toCell) {
        state.error = `Cannot place sample at ${atLocation(sourceLocation)}`
        return
    }

    const [destinationContainer, destinationCell] = getCell(state, destinationLocation)
    if (!destinationContainer || !destinationCell) {
        return state
    }
    if (destinationCell.sample !== null) {
        state.error = `Container at ${atLocation(destinationLocation)} already contains sample`
        return
    }
    if (destinationCell.fromCell || destinationCell.toCell) {
        state.error = `Cannot place sample at ${atLocation(destinationLocation)}`
        return
    }

    sourceCell.toCell = destinationLocation
    destinationCell.fromCell = sourceLocation

    return state
}

function placementCoordinates(sources: CellIdentifier[], destination: CellIdentifier): CellIdentifier[] {
    return []
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
        clickCell(state, action: PayloadAction<MouseOnCellPayload>) {
            const { parentContainer, coordinate, placementType = 'group', placementDirection = 'row' } = action.payload
            
            const [clickedContainer, clickedCell] = getCell(state, { parentContainer, coordinate })
            if (!clickedContainer || !clickedCell) {
                return state
            }
        }
    }
})

export const { loadSamplesAndContainers } = slice.actions
export default slice.reducer
