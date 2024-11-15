import { RootState } from "../../store";
import { ParentContainerIdentifier, PlacementCoordinates, RealParentContainerIdentifier, SampleDetail } from "./models";
import {
    selectParentContainer as selectParentContainerHelper,
    selectCell as SelectCellHelper,
    selectSampleDetail as selectSampleDetailHelper,
    selectOriginalSampleDetailOfCell as selectOriginalSampleDetailOfCellHelper,
    comparePlacementSamples,
} from "./helpers";
import { createSelector } from "@reduxjs/toolkit";

export function selectParentContainer(state: RootState, parentContainer: ParentContainerIdentifier['parentContainer']) {
    return selectParentContainerHelper(state.placement, { parentContainer })
}

export function selectCell(state: RootState, parentContainer: RealParentContainerIdentifier['parentContainer'], coordinates: PlacementCoordinates) {
    return SelectCellHelper(state.placement, { parentContainer, coordinates })
}

export const selectSampleDetailsOfContainer = createSelector(
    [
        (state: RootState) => state.placement.samples,
        (_: RootState, parentContainer: ParentContainerIdentifier['parentContainer']) => parentContainer
    ],
    (samples, parentContainer) => samples.filter(sample => sample.parentContainer === parentContainer)
)

export const selectPlacementSamples = createSelector(
    [
        (state: RootState) => state.placement.samples,
        selectSampleDetailsOfContainer,
        (state: RootState, parentContainer: ParentContainerIdentifier['parentContainer']) => selectParentContainer(state, parentContainer)?.samples
    ], 
    (allSampleDetails, sampleDetailsOfContainer, placementSamples) => {
        return [...sampleDetailsOfContainer, ...(placementSamples ?? [])].sort((a, b) => comparePlacementSamples({ samples: allSampleDetails }, a, b))
    }
)

export function selectOriginalSampleDetailOfCell(state: RootState, parentContainer: RealParentContainerIdentifier['parentContainer'], coordinates: PlacementCoordinates) {
    return selectOriginalSampleDetailOfCellHelper(state.placement, { parentContainer, coordinates })
}

export function selectSampleDetail(state: RootState, id: SampleDetail['id']) {
    return selectSampleDetailHelper(state.placement, id)
}

export const selectSampleDetails = createSelector([
    (state: RootState) => state.placement.samples,
    (_: RootState, ids: Array<SampleDetail['id']>) => ids,
], (samples, ids) => {
    const sampleIDs = new Set(ids)
    return samples.filter(sample => sampleIDs.has(sample.id))
})