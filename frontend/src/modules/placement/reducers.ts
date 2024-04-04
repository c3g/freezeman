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
        sample: Sample['id'] | null
    } | {
        status: 'selected'
        sample: Sample['id']
    } | {
        status: 'preview'
        sample: null
        fromCell: CellIdentifier
    } | {
        status: 'placed-in'
        sample: null
        fromCell: CellIdentifier
    } | {
        status: 'placed-out'
        sample: Sample['id']
        toCell: CellIdentifier
    }
}

export interface PlacementContainerState {
    spec: CoordinateSpec
    cells: Record<string, CellState | undefined>
}

export interface PlacementState {
    parentContainers: Record<ContainerIdentifier, PlacementContainerState | undefined>
    activeSelections: CellIdentifier[]
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

export function createEmptyCells(spec: CoordinateSpec) {
    const cells: PlacementContainerState['cells'] = {}
    for (const row of spec[0] ?? []) {
        for (const col of spec[1] ?? []) {
            cells[row + col] = {
                state: {
                    status: 'none',
                    sample: null
                }
            }
        }
    }

    return cells
}

export const initialState: PlacementState = {
    parentContainers: {},
    activeSelections: [],
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

                parentContainerState.cells = createEmptyCells(parentContainer.spec)

                // populate cells
                for (const container of parentContainer.containers) {
                    parentContainerState.cells[container.coordinate] = {
                        state: {
                            status: 'none', sample: container.sample
                        }
                    }
                }
            }
            return state
        },
        clickCell(state, action: PayloadAction<ClickCellPayload>) {
            const { parentContainer: parentContainerName, coordinate } = action.payload
            const parentContainer = state.parentContainers[parentContainerName]
            if (parentContainer) {
                const clickedCell = parentContainer.cells[coordinate]
                if (!clickedCell) {
                    throw new Error(`Invalid coordinate "${coordinate}" for parent container "${parentContainerName}"`)
                }

                // TODO: throw error if clickedCell is not at 'none' status
                if (clickedCell.state.status === 'none') {
                    if (clickedCell.state.sample) {
                        state.activeSelections.push(action.payload)
                        clickedCell.state = {
                            status: 'selected',
                            sample: clickedCell.state.sample
                        }
                    } else if (state.activeSelections.length > 0) {
                        // TODO: handle many activeSelection
                        const srcLocation = state.activeSelections[0]
                        const srcCell = state.parentContainers[srcLocation.parentContainer]?.cells[srcLocation.coordinate]
                        // srcCell must be in 'selected' status while in activeSelections anyways
                        if (srcCell && srcCell.state.status === 'selected') {
                            srcCell.state = {
                                status: 'placed-out',
                                sample: srcCell.state.sample,
                                toCell: action.payload
                            }
                            clickedCell.state = {
                                status: 'placed-in',
                                sample: null,
                                fromCell: srcLocation
                            }
                        }
                        state.activeSelections = []
                    }
                } else {
                    throw new Error(`The clicked cell at "${parentContainerName}@${coordinate}" is at status "${clickedCell?.state.status}" not "none"`)
                }
            } else {
                throw new Error(`Parent container with name '${parentContainerName}' has not been loaded`)
            }
            return state
        }
    }
})

export const { loadSamplesAndContainers, clickCell } = slice.actions
export default slice.reducer
