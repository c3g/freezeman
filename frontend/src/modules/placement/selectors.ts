import { RootState } from "../../store";
import { PlacementClass } from "./classes";
import { CellIdentifier, PlacementState, RealParentContainerIdentifier, TubesWithoutParentContainerIdentifier } from "./models";

export const selectPlacementState = (state: RootState) => state.placement
export const selectContainer = selectorWrapper((placement) => {
    return (containerID: RealParentContainerIdentifier | TubesWithoutParentContainerIdentifier) => {
        if (containerID.name === null) {
            return new PlacementClass(placement, containerID).getTubesWithoutParent()
        } else {
            return new PlacementClass(placement, undefined).getRealParentContainer(containerID)
        }
    }
})
export const selectCell = selectorWrapper((placement) => {
    return (cellID: CellIdentifier) => {
        return new PlacementClass(placement, undefined).getCell(cellID)
    }
})

function selectorWrapper<T>(selector: (state: PlacementState) => T) {
    return (state: RootState) => selector(selectPlacementState(state))
}