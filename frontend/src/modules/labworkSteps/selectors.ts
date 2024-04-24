import { RootState } from "../../store";
import { LabworkStepPlacementState } from './reducers'
import * as Reducer from './reducers'

export const selectLabworkStepPlacement = (state: RootState) => state.labworkStepPlacement
export const selectSourceContainers = selectorWrapper((state) => state.sourceContainers)
export const selectDestinationContainers = selectorWrapper((state) => state.destinationContainers)
export const selectActiveSourceContainer = selectorWrapper((state) => state.activeSourceContainer)
export const selectActiveDestinationContainer = selectorWrapper((state) => state.activeDestinationContainer)
export const selectSourceContainer = selectorWrapper(Reducer.selectSourceContainer)
export const selectDestinationContainer = selectorWrapper(Reducer.selectDestinationContainer)

function selectorWrapper<T>(selector: (state: LabworkStepPlacementState) => T) {
    return (state: RootState) => selector(selectLabworkStepPlacement(state))
}