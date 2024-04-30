import { RootState } from "../../store";
import { PlacementState } from "./models";
import * as Reducer from "./reducers"

export const selectPlacementState = (state: RootState) => state.placement
export const selectContainer = selectorWrapper(Reducer.selectContainer)
export const selectCell = selectorWrapper(Reducer.selectCell)

function selectorWrapper<T>(selector: (state: PlacementState) => T) {
    return (state: RootState) => selector(selectPlacementState(state))
}