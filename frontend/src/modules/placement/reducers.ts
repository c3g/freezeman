import { PayloadAction, createAction, createReducer, createSlice } from "@reduxjs/toolkit"
import { Container, Coordinate, Sample } from "../../models/frontend_models"
import { CoordinateSpec } from "../../models/fms_api_models"

export interface CellIdentifier {
    parentContainer: Container['id']
    column: number
    row: number
}

export interface Cell {
    state?: 'selected' | 'preview' | 'placed'
    sample?: Sample['id']
    fromCell?: CellIdentifier
    toCell?: CellIdentifier
}

export interface PlacementContainerState {
    isSource: boolean
    spec: CoordinateSpec
    cells: Cell[][]
}

export interface PlacementState {
    parentContainers: Record<Container['id'], PlacementContainerState | undefined>
    activeSelection: CellIdentifier[]
}

export interface LoadSamplesAndContainersPayload {
    parentContainers: {
        isSource: boolean
        id: Container['id']
        spec: CoordinateSpec
        containers: {
            row: Coordinate['row']
            column: Coordinate['column']
            sample?: Sample['id']
        }[]
    }[]
}


const slice = createSlice({
    name: 'PLACEMENT',
    initialState: { parentContainers: {} } as PlacementState,
    reducers: {
        loadSourceSamples(state, action: PayloadAction<LoadSamplesAndContainersPayload>) {
            const payload = action.payload
            for (const parentContainer of payload.parentContainers) {
                // initialize empty cells array
                const parentContainerState = state.parentContainers[parentContainer.id] ?? {
                    isSource: parentContainer.isSource,
                    cells: [],
                    spec: parentContainer.spec 
                }
                state.parentContainers[parentContainer.id] ??= parentContainerState

                // initialize array of cells
                const rowLength = parentContainer.spec[0]?.length ?? 1
                if (parentContainerState.cells.length < rowLength) {
                    for (let row = 0; row < rowLength; row++) {
                        const rowCell: Cell[] = []
                        for (let col = 0; col < (parentContainer.spec[1]?.length ?? 1); col++) {
                            rowCell.push({})
                        }
                        parentContainerState.cells.push(rowCell)
                    }
                }

                // populate cells
                const cells = parentContainerState.cells
                for (const container of parentContainer.containers) {
                    cells[container.row][container.column].sample = container.sample
                }
            }
        },
    }
})

export const { loadSourceSamples } = slice.actions
export default slice.reducer