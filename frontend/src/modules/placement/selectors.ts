import { RootState } from "../../store";
import { ParentContainerIdentifier, PlacementCoordinates, RealParentContainerIdentifier, SampleDetail } from "./models";
import {
    selectParentContainer as selectParentContainerHelper,
    selectCell as SelectCellHelper,
    selectSampleDetail as selectSampleDetailHelper,
    selectPlacementSamplesByParentContainerAndSampleIDs
} from "./helpers";
import { createSelector } from "@reduxjs/toolkit";

const selectPlacementState = (state: RootState) => state.placement

export const selectParentContainer = createSelector([
    selectPlacementState,
    (_, parentContainer: ParentContainerIdentifier['parentContainer']) => parentContainer
], (state, parentContainer) => {
    return selectParentContainerHelper(state, { parentContainer })
})

export const selectCell = createSelector([
    selectPlacementState,
    (_, parentContainer: RealParentContainerIdentifier['parentContainer']) => parentContainer,
    (_, __, coordinates: PlacementCoordinates) => coordinates
], (state, parentContainer, coordinates) => {
    return SelectCellHelper(state, { parentContainer, coordinates })
})

export const selectPlacementSamples = createSelector([
    selectPlacementState,
    (_, parentContainer: ParentContainerIdentifier['parentContainer']) => parentContainer
], (state, parentContainer) => {
    return selectPlacementSamplesByParentContainerAndSampleIDs(state, { parentContainer })
})

export const selectSampleDetail = createSelector([
    selectPlacementState,
    (_, id: SampleDetail['id']) => id
], (state, id) => {
    return selectSampleDetailHelper(state, id)
})
