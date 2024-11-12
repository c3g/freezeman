import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { Container } from "../../models/frontend_models"
import { PlacementType, ParentContainerState, PlacementOptions, PlacementGroupOptions } from "./models"
import { MouseOnCellPayload, PlaceAllSourcePayload, clickCellHelper, getParentContainer, initialState, multiSelectionHelper, placeSamplesHelper, reducerWithThrows, setPreviews, undoCellPlacement, loadContainerHelper, getRealParentContainer } from "./helpers"

const slice = createSlice({
    name: 'PLACEMENT',
    initialState,
    reducers: {
        loadContainer: reducerWithThrows(loadContainerHelper),
        setPlacementType(state, action: PayloadAction<PlacementOptions['type']>) {
            state.placementType = action.payload
        },
        setPlacementDirection(state, action: PayloadAction<PlacementGroupOptions['direction']>) {
            state.placementDirection = action.payload
        },
        clickCell: reducerWithThrows(clickCellHelper),
        placeAllSource: reducerWithThrows((state, payload: PlaceAllSourcePayload) => {
            const sourceCells = getParentContainer(state, { parentContainer: payload.source }).samples

            const container = getParentContainer(state, { parentContainer: payload.destination })
            if ('spec' in container) {
                const [axisRow, axisCol = [''] as const] = container.spec
                if (axisRow === undefined) return state

                // use pattern placement to place all source starting from the top-left of destination
                placeSamplesHelper(
                    state,
                    sourceCells, {
                    parentContainer: payload.destination,
                    coordinates: axisRow[0] + axisCol[0]
                }, {
                    type: PlacementType.PATTERN
                })
            }
        }),
        multiSelect: reducerWithThrows(multiSelectionHelper),
        onCellEnter: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getRealParentContainer(state, payload)
            // must be destination
            if (container.name !== payload.context.destinationParentContainer)
                setPreviews(state, payload, true)
        }),
        onCellExit: reducerWithThrows((state, payload: MouseOnCellPayload) => {
            const container = getRealParentContainer(state, payload)
            // must be destination
            if (container.name !== payload.context.destinationParentContainer) {
                for (const cell of container.cells) {
                    cell.preview = false
                }
            }
        }),
        undoSelectedSamples: reducerWithThrows((state, parentContainer: Container['name']) => {
            const container = getRealParentContainer(state, { parentContainer: parentContainer })
            for (const sample of container.samples) {
                if (sample.selected) {
                    undoCellPlacement(state, sample)
                }
            }
        }),
        flushContainers(state, action: PayloadAction<Array<ParentContainerState['name']>>) {
            const deletedContainerNames = new Set(action.payload ?? state.parentContainers.map((c) => c.name))
            state.parentContainers = state.parentContainers.filter((c) => !deletedContainerNames.has(c.name))
            const deletedSamples = new Set(state.samples.filter((s) => deletedContainerNames.has(s.parentContainer)).map((s) => s.id))
            state.samples = state.samples.filter((s) => !deletedContainerNames.has(s.parentContainer))
            for (const container of state.parentContainers) {
                container.samples = container.samples.filter((s) => !deletedSamples.has(s.id))
            }
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
