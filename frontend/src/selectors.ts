// 

/*
    Selector functions for use with the useSelector() hook from react-redux.
    The selector function is given the redux store state and returns a
    piece of state.

    Used by React functional components to retrieve state from the store.
    If components use selectors, then it is easier to change the shape of
    the store - we just need to update the selector function to point to
    the new location of a piece of state.

    Example:

    const projectsByID = useSelector(selectProjectsByID)
*/

export const selectProjectsByID = state => state.projects.itemsByID
export const selectReferenceGenomesByID = state => state.referenceGenomes.itemsByID
export const selectSamplesByID = state => state.samples.itemsByID
export const selectUsersByID = state => state.users.itemsByID
export const selectWorkflowsByID = state => state.workflows.itemsByID
