import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { PlacementOptions, PlacementGroupOptions } from "./models"
import { clickCellHelper, initialState, multiSelectionHelper, reducerWithThrows, loadContainerHelper, placeAllSourceHelper, onCellEnterHelper, onCellExitHelper, undoSelectedSamplesHelper, flushContainersHelper } from "./helpers"

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
        placeAllSource: reducerWithThrows(placeAllSourceHelper),
        multiSelect: reducerWithThrows(multiSelectionHelper),
        onCellEnter: reducerWithThrows(onCellEnterHelper),
        onCellExit: reducerWithThrows(onCellExitHelper),
        undoSelectedSamples: reducerWithThrows(undoSelectedSamplesHelper),
        flushContainers: reducerWithThrows(flushContainersHelper),
        flushPlacement(state) { Object.assign(state, initialState) }
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
