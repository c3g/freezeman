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
    barcode?: string
    spec: CoordinateSpec
    cells: Record<string, CellState | undefined>
}

export interface PlacementState {
    parentContainers: Record<ContainerIdentifier, PlacementContainerState | undefined>
    activeSelections: CellIdentifier[]
    activeSourceContainer?: ContainerIdentifier
    activeDestinationContainer?: ContainerIdentifier
    error?: string
}

export type LoadContainersPayload = {
    name: ContainerIdentifier
    barcode?: string
    spec: CoordinateSpec
    containers: {
        coordinates: string
        sample: Sample['id']
    }[]
}[]

export interface PlacementPatternOptions {
    type: 'pattern'
}
export interface PlacementGroupOptions {
    type: 'group'
    direction: 'row' | 'column'
}
export type PlacementOptions = PlacementPatternOptions | PlacementGroupOptions

export interface MouseOnCellPayload extends CellIdentifier {
    placementOptions: PlacementOptions
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

function getCell(state: Draft<PlacementState>, location: CellIdentifier) {
    const container = state.parentContainers[location.parentContainer]
    if (!container) {
        throw new Error(`Container not found: "${location.parentContainer}"`)
    }
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
        throw new Error(`Source sample from ${sourceLocation} already placed (at ${sourceCell.samplePlacedAt})`)
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
    const destinationContainer = state.parentContainers[destination.parentContainer]
    if (!destinationContainer) {
        throw new Error(`Could not find destination container at ${atLocation(destination)}`)
    }
    const destinationStartingOffsets = coordinatesToOffsets(destinationContainer.spec, destination.coordinates)

    switch (placementOptions.type) {
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

function clickCellHelper(state: Draft<PlacementState>, payload: MouseOnCellPayload) {
    const { parentContainer, coordinates: coordinate, placementOptions } = payload
                
    const clickedLocation: CellIdentifier = { parentContainer, coordinates: coordinate }
    const clickedCell = getCell(state, clickedLocation)
    if (clickedCell.sample !== null && !clickedCell.samplePlacedAt) {
        if (parentContainer !== state.activeSourceContainer) return state

        clickedCell.selected = !clickedCell.selected
        if (clickedCell.selected) {
            state.activeSelections.push(clickedLocation)
        } else {
            state.activeSelections = state.activeSelections.filter((c) => !(c.coordinates === clickedLocation.coordinates && c.parentContainer === clickedLocation.parentContainer))
        }
    } else if (state.activeSelections.length > 0) {
        if (parentContainer !== state.activeDestinationContainer) return state

        // relying on placeCell to do error checking

        const destinationLocations = placementDestinationLocations(state, state.activeSelections, clickedLocation, placementOptions)
        state.activeSelections.forEach((_, index) => {
            placeCell(state, state.activeSelections[index], destinationLocations[index])
            const cell = getCell(state, state.activeSelections[index])
            cell.selected = false
        })
        destinationLocations.forEach((location) => {
            getCell(state, location).preview = false
        })
        state.activeSelections = []
    }

    return state
}

function setPreviews(state: Draft<PlacementState>, payload: MouseOnCellPayload, preview: boolean) {
    const { parentContainer, coordinates: coordinate, placementOptions } = payload
    if (parentContainer !== state.activeDestinationContainer) return state

    const clickedLocation: CellIdentifier = { parentContainer, coordinates: coordinate }

    const clickedCell = getCell(state, clickedLocation)

    if (clickedCell.sample === null || clickedCell.samplePlacedAt) {
        const destinationLocations = placementDestinationLocations(state, state.activeSelections, clickedLocation, placementOptions)
        state.activeSelections.forEach((_, index) => {
            getCell(state, destinationLocations[index]).preview = preview
        })
    }

    return state
}

const initialState: PlacementState = {
    parentContainers: {},
    activeSelections: [],
}

const slice = createSlice({
    name: 'PLACEMENT',
    initialState,
    reducers: {
        loadContainers(state, action: PayloadAction<LoadContainersPayload>) {
            const parentContainers = action.payload
            for (const parentContainer of parentContainers) {
                // initialize container state
                const parentContainerState: PlacementContainerState = {
                    barcode: parentContainer.barcode,
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
        setActiveSourceContainer(state, action: PayloadAction<ContainerIdentifier>) {
            if (action.payload in state.parentContainers) {
                state.activeSourceContainer = action.payload
            } else {
                state.error = `Container with name ${action.payload} has not been loaded`
            }
            return state
        },
        setActiveDestinationContainer(state, action: PayloadAction<ContainerIdentifier>) {
            if (action.payload in state.parentContainers) {
                if (action.payload !== state.activeDestinationContainer) {
                    state.activeSelections = []
                }
                state.activeDestinationContainer = action.payload
            } else {
                state.error = `Container with name ${action.payload} has not been loaded`
            }
            return state
        },
        clickCell(state, action: PayloadAction<MouseOnCellPayload>) {
            try {
                return clickCellHelper(state, action.payload)
            } catch (e) {
                const originalState = original(state) ?? initialState
                return {
                    ...originalState,
                    error: e.toString()
                }
            }
        },
        onCellEnter(state, action: PayloadAction<MouseOnCellPayload>) {
            try {
                return setPreviews(state, action.payload, true)
            } catch (e) {
                const originalState = original(state) ?? initialState
                return {
                    ...originalState,
                    error: e.toString()
                }
            }
        },
        onCellExit(state, action: PayloadAction<MouseOnCellPayload>) {
            try {
                return setPreviews(state, action.payload, false)
            } catch (e) {
                const originalState = original(state) ?? initialState
                return {
                    ...originalState,
                    error: e.toString()
                }
            }
        }
    }
})

export const { loadContainers, setActiveSourceContainer, setActiveDestinationContainer, clickCell, onCellEnter, onCellExit } = slice.actions
export const internals = {
    initialState,
    createEmptyCells,
    coordinatesToOffsets,
    offsetsToCoordinates,
    placementDestinationLocations,
    clickCellHelper,
    setPreviews,
}
export default slice.reducer
