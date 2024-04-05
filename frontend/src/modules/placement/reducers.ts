import { Draft, PayloadAction, createSlice, original } from "@reduxjs/toolkit"
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
    placedFrom?: CellIdentifier
    placedAt?: CellIdentifier
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
            coordinates: string
            sample: Sample['id']
        }[]
    }[]
}

export type PlacementType = 'group' | 'pattern'
export type PlacementDirection = 'row' | 'column'  
export interface MouseOnCellPayload extends CellIdentifier {
    placementType: PlacementType
    placementDirection: PlacementDirection
}

function createEmptyCells(spec: CoordinateSpec) {
    const cells: PlacementContainerState['cells'] = {}
    for (const row of spec[0] ?? []) {
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
        throw new Error(`Container not found: "${location.parentContainer}"`)
    }
    const cell = container.cells[location.coordinates]
    if (!cell) {
        throw new Error(`Invalid coordinate: "${atLocation(location)}"`)
    }

    return { container, cell }
}

function placeCell(state: Draft<PlacementState>, sourceLocation: CellIdentifier, destinationLocation: CellIdentifier) {
    const sourceCell = getContainerAndCell(state, sourceLocation).cell
    if (!sourceCell.sample) {
        throw new Error(`Container at "${atLocation(sourceLocation)}" has no sample`)
    }
    if (sourceCell.placedAt) {
        throw new Error(`Sample at ${atLocation(sourceLocation)} already placed`)
    }

    const destinationCell = getContainerAndCell(state, destinationLocation).cell
    if (destinationCell.sample !== null && !destinationCell.placedAt) {
        throw new Error(`Container at ${atLocation(destinationLocation)} already contains sample`)
    }
    if (destinationCell.sample === null && !destinationCell.placedFrom) {
        throw new Error(`Sample already placed at ${atLocation(destinationLocation)}`)
    }

    sourceCell.placedAt = destinationLocation
    destinationCell.placedFrom = sourceLocation
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

function placementDestinationLocations(state: PlacementState, sources: CellIdentifier[], destination: CellIdentifier, placementType: PlacementType, placementDirection: PlacementDirection): CellIdentifier[] {
    const newOffsetsList: number[][] = []
    const destinationContainer = state.parentContainers[destination.parentContainer]
    if (!destinationContainer) {
        throw new Error(`Could not find destination container at ${atLocation(destination)}`)
    }
    const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, destination.coordinates)

    switch (placementType) {
        case 'pattern': {
            const sourceContainerNames = new Set(sources.map((s) => s.parentContainer))
            if (sourceContainerNames.size > 1) {
                throw new Error('Cannot use pattern placement type with more than one source container')
            }

            const sourceOffsetsList = sources.map((source) => {
                const parentContainer = state.parentContainers[source.parentContainer]
                if (parentContainer) {
                    return coordinatesToOffsets(parentContainer.spec, source.coordinates)
                } else {
                    throw new Error(`Could not find source container at ${atLocation(source)}`)
                }
            })
        
            for (const sourceOffsets of sourceOffsetsList) {
                const newSourceOffsets: typeof sourceOffsets = []
                for (let index = 0; index < destinationContainer.spec.length; index++) {
                    newSourceOffsets.push(sourceOffsets[index] + destinationStartingOffsets[index])
                }
                newOffsetsList.push(newSourceOffsets)
            }
            break
        }
        case 'group': {
            for (let index = 0; index < sources.length; index++) {
                newOffsetsList.push(destinationStartingOffsets.map((offset, axis) =>
                    offset + (placementDirection === 'row' && axis == 1 ? index : 0) + (placementDirection === 'column' && axis == 0 ? index : 0)
                ))
            }        
        }
    }

    return newOffsetsList.map((offsets) => ({ parentContainer: destination.parentContainer, coordinates: offsetsToCoordinates(offsets, destinationContainer.spec) }))
}

function clickCellHelper(state: Draft<PlacementState>, action: PayloadAction<MouseOnCellPayload>) {
    const { parentContainer, coordinates: coordinate, placementType = 'group', placementDirection = 'row' } = action.payload
                
    const clickedLocation: CellIdentifier = { parentContainer, coordinates: coordinate }
    const clickedCell = getContainerAndCell(state, clickedLocation).cell
    if (!clickedCell.placedAt) {
        clickedCell.selected = !clickedCell.selected
        if (clickedCell.selected) {
            state.activeSelections.push(clickedLocation)
        } else {
            state.activeSelections = state.activeSelections.filter((c) => !(c.coordinates === clickedLocation.coordinates && c.parentContainer === clickedLocation.parentContainer))
        }
    } else if (state.activeSelections.length > 0) {
        // relying on placeCell to do error checking

        const destinationLocations = placementDestinationLocations(state, state.activeSelections, clickedLocation, placementType, placementDirection)
        for (let index = 0; index < state.activeSelections.length; index++) {
            placeCell(state, state.activeSelections[index], destinationLocations[index])
            getContainerAndCell(state, state.activeSelections[index]).cell.selected = false
        }
        state.activeSelections = []
    }
}

const initialState: PlacementState = {
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
            try {
                clickCellHelper(state, action)
            } catch (e) {
                const originalState = original(state) ?? initialState
                return {
                    ...originalState,
                    error: e.toString()
                }
            }

            return state
        }
    }
})

export const { loadSamplesAndContainers, clickCell } = slice.actions
export const helpers = {
    initialState,
    createEmptyCells,
    coordinatesToOffsets,
    offsetsToCoordinates,
    placementDestinationLocations,
    clickCellHelper,
}
export default slice.reducer
