import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { Container, Sample } from "../../models/frontend_models"
import { CoordinateSpec } from "../../models/fms_api_models"

type ContainerIdentifier = Container['name']

export interface CellIdentifier {
    parentContainer: ContainerIdentifier
    coordinate: string
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
        sample: undefined
        fromCell: CellIdentifier
    } | {
        status: 'placed-in' | 'highlight'
        sample: undefined
        fromCell: CellIdentifier
    } | {
        status: 'placed-out'
        sample: Sample['id']
        toCell: CellIdentifier
    }
}

export interface PlacementContainerState {
    spec: CoordinateSpec
    cells: Record<string, CellState>
}

export interface PlacementState {
    parentContainers: Record<ContainerIdentifier, PlacementContainerState | undefined>
    activeSelection: CellIdentifier[]
    dragStart: CellIdentifier | null
    placementType: 'group' | 'pattern'
    placementDirection: 'row' | 'column'
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

export interface ClickCellPayload extends CellIdentifier { }

const initialState: PlacementState = {
    parentContainers: {},
    activeSelection: [],
    dragStart: null,
    placementType: 'pattern',
    placementDirection: 'row'
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

                // populate cells
                for (const container of parentContainer.containers) {
                    parentContainerState.cells[container.coordinate].state = { status: 'none', sample: container.sample }
                }
            }
        },
        clickCell(state, action: PayloadAction<ClickCellPayload>) {
            const { parentContainer: parentContainerID, coordinate } = action.payload
            const parentContainer = state.parentContainers[parentContainerID]
            if (parentContainer) {
                const destCell = parentContainer.cells[coordinate]
                if (destCell.state.status === 'none') {
                    if (destCell.state.sample) {
                        state.activeSelection.push(action.payload)
                    } else if (state.activeSelection.length > 0) {
                        const activeSelection = state.activeSelection[0]
                        const sourceCell = state.parentContainers[activeSelection.parentContainer]?.cells[activeSelection.coordinate]
                        if (sourceCell && sourceCell.state.status === 'selected') {
                            sourceCell.state = {
                                status: 'placed-out',
                                sample: sourceCell.state.sample,
                                toCell: action.payload
                            }
                            destCell.state = {
                                status: 'placed-in',
                                sample: undefined,
                                fromCell: { parentContainer: activeSelection.parentContainer, coordinate }
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
