import store, { RootState } from "../../store";
import { fms_env } from "../../utils/functions";
import { PlacementClass } from "./classes";
import { CellIdentifier, ParentContainerIdentifier, PlacementState, RealParentContainerIdentifier } from "./models";

export const selectPlacementState = (state: RootState) => state.placement
export const selectParentContainer = selectorWrapper((placement) => {
    return (containerID: ParentContainerIdentifier) => {
        if (containerID.name === null) {
            return new PlacementClass(placement, containerID).getTubesWithoutParent()
        } else {
            return new PlacementClass(placement, undefined).getRealParentContainer(containerID)
        }
    }
})
export const selectRealParentContainer = selectorWrapper((placement) => {
    return (containerID: RealParentContainerIdentifier) => {
        return new PlacementClass(placement, undefined).getRealParentContainer(containerID)
    }
})
export const selectTubesWithoutParentContainer = selectorWrapper((placement) => {
    return new PlacementClass(placement, undefined).getTubesWithoutParent()
})

export const selectCell = selectorWrapper((placement) => {
    return (cellID: CellIdentifier) => {
        return new PlacementClass(placement, undefined).getCell(cellID)
    }
})

function selectorWrapper<T>(selector: (state: PlacementState) => T) {
    return (state: RootState) => selector(selectPlacementState(state))
}

if (!fms_env()) {
    window.placement = (containerID: ParentContainerIdentifier | undefined) => {
        const placementState = selectPlacementState(store.getState())
        return new PlacementClass(placementState, containerID)
    }
}