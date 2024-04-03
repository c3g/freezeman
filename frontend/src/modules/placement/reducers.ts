import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { Container, Coordinate, Sample } from "../../models/frontend_models"
import { CoordinateSpec } from "../../models/fms_api_models"

type ContainerIdentifier = Container['name']

export interface CellIdentifier {
    parentContainer: ContainerIdentifier
    column: number
    row: number
}

export interface CellState {
    state: {
        status: 'none'
        sample?: Sample['id']
    } | {
        status: 'selected'
        sample: Sample['id']
    } | {
        status: 'preview'
        fromCell: CellIdentifier
    } | {
        status: 'placed-in'
        fromCell: CellIdentifier
    } | {
        status: 'placed-out'
        sample: Sample['id']
        toCell: CellIdentifier
    }
}

export interface PlacementContainerState {
    spec: CoordinateSpec
    cells: CellState[][]
}

export interface PlacementState {
    parentContainers: Record<ContainerIdentifier, PlacementContainerState | undefined>
    activeSelection: CellIdentifier[]
    dragStart: CellIdentifier | null
}

export interface LoadSamplesAndContainersPayload {
    parentContainers: {
        name: ContainerIdentifier
        spec: CoordinateSpec
        containers: {
            row: Coordinate['row']
            column: Coordinate['column']
            sample: Sample['id']
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
        loadSamplesAndContainers(state, action: PayloadAction<LoadSamplesAndContainersPayload>) {
            const parentContainers = action.payload.parentContainers
            for (const parentContainer of parentContainers) {
                // initialize empty cells array
                const parentContainerState: NonNullable<PlacementState['parentContainers'][number]> = {
                    cells: [],
                    spec: parentContainer.spec
                }
                state.parentContainers[parentContainer.name] = parentContainerState

                // initialize array of cells
                const rowLength = parentContainer.spec[0]?.length ?? 1
                if (parentContainerState.cells.length < rowLength) {
                    for (let row = 0; row < rowLength; row++) {
                        const rowCell: CellState[] = []
                        for (let col = 0; col < (parentContainer.spec[1]?.length ?? 1); col++) {
                            rowCell.push({ state: { status: 'none' } })
                        }
                        parentContainerState.cells.push(rowCell)
                    }
                }

                // populate cells
                const cells = parentContainerState.cells
                for (const container of parentContainer.containers) {
		            cells[container.row][container.column].state = { status: 'none', sample: container.sample }
                }
            }
        },
        clickCell(state, action: PayloadAction<ClickCellPayload>) {
            const { parentContainer: parentContainerID, row, column } = action.payload
            const parentContainer = state.parentContainers[parentContainerID]
            if (parentContainer) {
                const cell = parentContainer.cells[row][column]
                if (cell.state.status === 'none') {
                    if (cell.state.sample) {
                        state.activeSelection.push(action.payload)
                    } else if (state.activeSelection.length > 0) {
                        cell.state = {
			    status: 'placed-in',
			    fromCell: action.payload
			}
                        const activeSelection = state.activeSelection[0]
                        const sourceCell = state.parentContainers[activeSelection.parentContainer]?.cells[activeSelection.row][activeSelection.column]
                        if (sourceCell && sourceCell.state.status === 'selected') {
                            sourceCell.state = {
			        status: 'placed-out',
				sample: sourceCell.state.sample,
			        toCell: { parentContainer: parentContainerID, row, column }
			    }
                        }
			state.activeSelection = []
                    }
                }
            }
            return state
        }
    }
})

export const { loadSamplesAndContainers, clickCell } = slice.actions
export default slice.reducer
