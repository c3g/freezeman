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

export const selectProjectsByID = (state: RootState) => state.projects.itemsByID
export const selectReferenceGenomesByID = (state: RootState) => state.referenceGenomes.itemsByID
export const selectSamplesByID = (state: RootState) => state.samples.itemsByID
export const selectStudiesByID = (state: RootState) => state.studies.itemsByID
export const selectTaxonsByID = (state: RootState) => state.taxons.itemsByID
export const selectUsersByID = (state: RootState) => state.users.itemsByID
export const selectWorkflowsByID = (state: RootState) => state.workflows.itemsByID

