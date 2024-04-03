import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { Container, Coordinate, Sample } from "../../models/frontend_models"
import { CoordinateSpec } from "../../models/fms_api_models"

export interface CellIdentifier {
    parentContainerID: Container['id']
    column: number
    row: number
}

export type CellState = {
    state: 'none' | 'selected' | 'preview' | 'placed-out' | 'placed-in'
    sample: Sample['id'] | null
    toCell: CellIdentifier | null
    fromCell: CellIdentifier | null
}

export interface PlacementContainerState {
    spec: CoordinateSpec
    cells: CellState[][]
}

export interface PlacementState {
    parentContainers: Record<Container['id'], PlacementContainerState | undefined>
    activeSelection: CellIdentifier[]
    dragStart: CellIdentifier  | null
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

export interface ClickCellPayload extends CellIdentifier {}

const initialState: PlacementState = {
    parentContainers: {},
    activeSelection: [],
    dragStart: null
}

const slice = createSlice({
    name: 'PLACEMENT',
    initialState,
    reducers: {
        loadSourceSamples(state, action: PayloadAction<LoadSamplesAndContainersPayload>) {
            const parentContainers = action.payload.parentContainers
            for (const parentContainer of parentContainers) {
                // initialize empty cells array
                const parentContainerState: NonNullable<PlacementState['parentContainers'][number]> = {
                    cells: [],
                    spec: parentContainer.spec
                }
                state.parentContainers[parentContainer.id] = parentContainerState

                // initialize array of cells
                const rowLength = parentContainer.spec[0]?.length ?? 1
                if (parentContainerState.cells.length < rowLength) {
                    for (let row = 0; row < rowLength; row++) {
                        const rowCell: CellState[] = []
                        for (let col = 0; col < (parentContainer.spec[1]?.length ?? 1); col++) {
                            rowCell.push({
                                state: 'none',
                                sample: null,
                                toCell: null,
                                fromCell: null
                            })
                        }
                        parentContainerState.cells.push(rowCell)
                    }
                }

                // populate cells
                const cells = parentContainerState.cells
                for (const container of parentContainer.containers) {
                    cells[container.row][container.column].sample = container.sample ?? null
                }
            }
        },
        clickCell(state, action: PayloadAction<ClickCellPayload>) {
            const { parentContainerID, row, column } = action.payload
            const parentContainer = state.parentContainers[parentContainerID]
            if (parentContainer) {
                const cell = parentContainer.cells[row][column]
                if (cell.state === 'none'|| cell.state === 'preview') {
                    if (cell.sample) {
                        state.activeSelection.push(action.payload)
                    } else if (state.activeSelection.length > 0) {
                        cell.state = 'placed-in'
                        cell.fromCell = action.payload
                        // should not be undefined
                        const activeSelection = state.activeSelection.pop() as CellIdentifier
                        const sourceCell = state.parentContainers[activeSelection.parentContainerID]?.cells[activeSelection.row][activeSelection.column]
                        if (sourceCell) {
                            sourceCell.state = 'placed-out'
                            sourceCell.toCell = action.payload
                        }
                    }
                }
            }
            return state
        }
    }
})

export const { loadSourceSamples } = slice.actions
export default slice.reducer