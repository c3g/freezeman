import { Index, ItemsByID, Library, Project, Protocol, ReferenceGenome, Sample, SampleKind, Study, Taxon, User, Workflow } from "./models/frontend_models"
import { LabworkSummaryState } from "./modules/labwork/reducers"
import { StudySamplesState } from "./modules/studySamples/reducers"
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
export const selectIndicesByID = (state: RootState) => state.indices.itemsByID as ItemsByID<Index>
export const selectIndividualsByID = (state: RootState) => state.individuals.itemsByID
export const selectLabworkSummaryState = (state: RootState) => state.labworkSummary as LabworkSummaryState
export const selectLibrariesByID = (state: RootState) => state.libraries.itemsByID as ItemsByID<Library>
export const selectProjectsByID = (state: RootState) => state.projects.itemsByID as ItemsByID<Project>
export const selectProtocolsByID = (state: RootState) => state.protocols.itemsByID as ItemsByID<Protocol>
export const selectReferenceGenomesByID = (state: RootState) => state.referenceGenomes.itemsByID as ItemsByID<ReferenceGenome>
export const selectSamplesByID = (state: RootState) => state.samples.itemsByID as ItemsByID<Sample>
export const selectSampleKindsByID = (state: RootState) => state.sampleKinds.itemsByID as ItemsByID<SampleKind>
export const selectStudySamples = (state: RootState) => state.studySamples as StudySamplesState
export const selectStudiesByID = (state: RootState) => state.studies.itemsByID as ItemsByID<Study>
export const selectTaxonsByID = (state: RootState) => state.taxons.itemsByID as ItemsByID<Taxon>
export const selectUsersByID = (state: RootState) => state.users.itemsByID as ItemsByID<User>
export const selectWorkflowsByID = (state: RootState) => state.workflows.itemsByID as ItemsByID<Workflow>
