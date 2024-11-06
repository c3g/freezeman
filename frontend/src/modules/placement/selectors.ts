import { RootState } from "../../store";
import { PlacementState } from "./models";
import { selectContainer as helperSelectContainer, selectCell as helperSelectCell } from "./helpers";

export const selectPlacementState = (state: RootState) => state.placement
export const selectContainer = selectorWrapper(helperSelectContainer)
export const selectCell = selectorWrapper(helperSelectCell)

function selectorWrapper<T>(selector: (state: PlacementState) => T) {
    return (state: RootState) => selector(selectPlacementState(state))
}