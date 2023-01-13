import { RootState } from "./store"

/*
    Selector functions for use with the useSelector() hook from react-redux,
    or the useAppSelector() hook defined for the application.
    The selector function is given the redux store state and returns a
    piece of state.

    Used by React functional components to retrieve state from the store.
    If components use selectors, then it is easier to change the shape of
    the store - we just need to update the selector function to point to
    the new location of a piece of state.

    Example:

    const projectsByID = useSelector(selectProjectsByID)
*/

export const selectContainersByID = (state: RootState) => state.containers.itemsByID
export const selectIndividualsByID = (state: RootState) => state.individuals.itemsByID
export const selectProjectsByID = (state: RootState) => state.projects.itemsByID
export const selectReferenceGenomesByID = (state: RootState) => state.referenceGenomes.itemsByID
export const selectSamplesByID = (state: RootState) => state.samples.itemsByID
export const selectStudiesByID = (state: RootState) => state.studies
export const selectUsersByID = (state: RootState) => state.users.itemsByID
export const selectWorkflowsByID = (state: RootState) => state.workflows.itemsByID
