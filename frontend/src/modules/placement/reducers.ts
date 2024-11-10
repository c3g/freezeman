import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { Container } from "../../models/frontend_models"
import { PlacementType, ParentContainerState, PlacementSample, PlacementOptions, PlacementGroupOptions } from "./models"
import { LoadContainerPayload, MouseOnCellPayload, PlaceAllSourcePayload, clickCellHelper, selectPlacementSample, findPlacementSampleIndex, getCell, getContainer, getParentContainer, initialParentContainerState, initialState, multiSelectHelper, placeSamplesHelper, reducerWithThrows, selectParentContainer, setPreviews, undoCellPlacement } from "./helpers"

const slice = createSlice({
    name: 'PLACEMENT',
    initialState,
    reducers: {
        loadContainer: reducerWithThrows((state, payload: LoadContainerPayload) => {
            /* Update or Add parent container */
            if (payload.parentContainerName) {
                const foundContainer = selectParentContainer(state, { parentContainer: payload.parentContainerName })
                if (!foundContainer) {
                    state.parentContainers.push(initialParentContainerState(payload))
                }
            }

            /* Update or Add samples */
            const payloadSampleNames: Set<PlacementSample['name']> = new Set()
            for (const payloadCell of payload.cells) {
                payloadSampleNames.add(payloadCell.name)

                let payloadSample: PlacementSample
                if (payloadCell.coordinates) {
                    // with parent container
                    payloadSample = {
                        name: payloadCell.name,
                        project: payloadCell.projectName,
                        id: payloadCell.sample,
                        parentContainer: payloadCell.name,
                        container: 'unknown-container',
                        coordinates: payloadCell.coordinates,
                        selected: false,
                        highlight: false,
                        amountByCell: {},
                        totalAmount: 1,
                    }
                } else {
                    // without parent container
                    payloadSample = {
                        name: payloadCell.name,
                        project: payloadCell.projectName,
                        id: payloadCell.sample,
                        parentContainer: null,
                        container: 'unknown-container',
                        coordinates: null,
                        selected: false,
                        highlight: false,
                        amountByCell: {},
                        totalAmount: 1,
                    }
                }

                const foundSampleIndex = findPlacementSampleIndex(state, payloadCell.name)
                if (foundSampleIndex) {
                    const foundSample = state.samples[foundSampleIndex]
                    state.samples[foundSampleIndex] = {
                        ...payloadSample,
                        selected: foundSample.selected,
                        highlight: foundSample.highlight,
                        amountByCell: foundSample.amountByCell,
                    }
                } else {
                    state.samples.push(payloadSample)
                }
            }

            /* Remove samples that have disappeared */
            const samples = Object.values(state.samples).reduce((samples, sample) => {
                if (sample.parentContainer === payload.parentContainerName) {
                    samples.add(sample.name)
                }
                return samples
            }, new Set<PlacementSample['name']>())
            for (const sampleName of samples) {
                if (!payloadSampleNames.has(sampleName)) {
                    const sampleIndex = state.samplesIndexByName[sampleName]
                    if (!sampleIndex) {
                        throw new Error(`Sample ${sampleName} not found in sampleIndexByName`)
                    }
                    const sample = state.samples[sampleIndex]
                    delete state.samples[sampleIndex]
                    delete state.samplesIndexByName[sampleName]
                    if (payload.parentContainerName !== null && sample.coordinates) {
                        delete state.samplesIndexByCellIdentifier[`${payload.parentContainerName}@${sample.coordinates}`]
                    }
                }
            }
        }),
        setPlacementType(state, action: PayloadAction<PlacementOptions['type']>) {
            state.placementType = action.payload
        },
        setPlacementDirection(state, action: PayloadAction<PlacementGroupOptions['direction']>) {
            state.placementDirection = action.payload
        },
        clickCell: reducerWithThrows(clickCellHelper),
        placeAllSource: reducerWithThrows((state, payload: PlaceAllSourcePayload) => {
            const sourceCells = getContainer(state, { parentContainer: payload.source }).cells.filter((c) => c.sample)

            const [axisRow, axisCol = [''] as const] = getParentContainer(state, { name: payload.destination }).spec
            if (axisRow === undefined) return state

            // use pattern placement to place all source starting from the top-left of destination
            placeSamplesHelper(state, sourceCells, getCell(state, {
                parentContainer: payload.destination,
                coordinates: axisRow[0] + axisCol[0]
            }), {
                type: PlacementType.PATTERN
            })
        }),
        multiSelect: reducerWithThrows(multiSelectHelper),
        onCellEnter: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getParentContainer(state, payload)
            // must be destination
            if (container.name !== payload.context.source)
                setPreviews(state, payload, true)
        }),
        onCellExit: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getParentContainer(state, payload)
            // must be destination
            if (container.name !== payload.context.source) {
                for (const cell of container.cells) {
                    cell.preview = false
                }
            }
        }),
        undoSelectedSamples: reducerWithThrows((state, parentContainer: Container['name']) => {
            const container = getContainer(state, { name: parentContainer })
            let cells = container.cells.filter((c) => c.selected)
            if (cells.length === 0) {
                // 0 cells have been selected, so undo placement for all cells
                cells = container.cells
            }

            // undo placements
            for (const cell of cells) {
                undoCellPlacement(state, cell)
            }
        }),
        flushContainers(state, action: PayloadAction<Array<ParentContainerState['name']>>) {
            const deletedContainerNames = new Set(action.payload ?? state.containers.map((c) => c.name))
            for (const parentContainer of state.containers) {
                for (const cell of parentContainer.cells) {
                    if (
                        (cell.placedAt?.parentContainerName !== undefined && deletedContainerNames.has(cell.placedAt.parentContainerName))
                        ||
                        (cell.placedFrom?.parentContainerName !== undefined && deletedContainerNames.has(cell.placedFrom.parentContainerName))
                    ) {
                        undoCellPlacement(state, cell)
                    }
                }
            }
            state.containers = state.containers.filter((c) => !deletedContainerNames.has(c.name))
        },
        flushPlacement(state) {
            Object.assign(state, initialState)
        }
    }
})

export type PlacementAction = ReturnType<typeof slice.actions[keyof typeof slice.actions]>
export const {
    loadContainer,
    setPlacementType,
    setPlacementDirection,
    clickCell,
    placeAllSource,
    onCellEnter,
    onCellExit,
    multiSelect,
    undoSelectedSamples,
    flushContainers,
    flushPlacement,
} = slice.actions
export default slice.reducer
