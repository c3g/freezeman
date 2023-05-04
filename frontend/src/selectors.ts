import { Coordinate, Index, ItemsByID, Library, Process, ProcessMeasurement, Project, PropertyValue, Protocol, ReferenceGenome, Sample, SampleKind, Study, Taxon, User, Workflow } from "./models/frontend_models"
import { LabworkSummaryState } from "./modules/labwork/reducers"
import { LabworkStepsState } from "./modules/labworkSteps/models"
import { StudySamplesByID, StudySettingsByID } from "./modules/studySamples/models"
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

export const selectAppInitialzed = (state: RootState) => state.app.initialized
export const selectAuthState = (state: RootState) => state.auth
export const selectAuthTokenAccess = (state: RootState) => state.auth?.tokens?.access
export const selectContainersByID = (state: RootState) => state.containers.itemsByID
export const selectContainerKindsByID = (state: RootState) => state.containerKinds.itemsByID
export const selectCoordinatesByID = (state: RootState) => state.coordinates.itemsByID as ItemsByID<Coordinate>
export const selectHideEmptySteps = (state: RootState) => state.studySamples.hideEmptySteps
export const selectIndicesByID = (state: RootState) => state.indices.itemsByID as ItemsByID<Index>
export const selectIndividualsByID = (state: RootState) => state.individuals.itemsByID
export const selectLabworkStepsState = (state: RootState) => state.labworkSteps as LabworkStepsState
export const selectLabworkSummaryState = (state: RootState) => state.labworkSummary as LabworkSummaryState
export const selectLibrariesByID = (state: RootState) => state.libraries.itemsByID as ItemsByID<Library>
export const selectLibraryTemplateActions = (state: RootState) => state.libraryTemplateActions
export const selectPageSize = (state: RootState) => state.pagination.pageSize
export const selectProcessesByID = (state: RootState) => state.processes.itemsByID as ItemsByID<Process>
export const selectProcessMeasurementsByID = (state: RootState) => state.processMeasurements.itemsByID as ItemsByID<ProcessMeasurement>
export const selectProcessMeasurementTemplateActions = (state: RootState) => state.processMeasurementTemplateActions
export const selectProjectsByID = (state: RootState) => state.projects.itemsByID as ItemsByID<Project>
export const selectPropertyValuesByID = (state: RootState) => state.propertyValues.itemsByID as ItemsByID<PropertyValue>
export const selectProtocolsByID = (state: RootState) => state.protocols.itemsByID as ItemsByID<Protocol>
export const selectReferenceGenomesByID = (state: RootState) => state.referenceGenomes.itemsByID as ItemsByID<ReferenceGenome>
export const selectSamplesByID = (state: RootState) => state.samples.itemsByID as ItemsByID<Sample>
export const selectSampleKindsState = (state: RootState) => state.sampleKinds
export const selectSampleKindsByID = (state: RootState) => state.sampleKinds.itemsByID as ItemsByID<SampleKind>
export const selectSampleNextStepTemplateActions = (state: RootState) => state.sampleNextStepTemplateActions.items
export const selectSampleTemplateActions = (state: RootState) => state.sampleTemplateActions
export const selectStudySamplesByID = (state: RootState) => state.studySamples.studySamplesByID as StudySamplesByID
export const selectStudySettingsByID = (state: RootState) => state.studySamples.studySettingsByID as StudySettingsByID
export const selectStepsByID = (state: RootState) => state.steps.itemsByID
export const selectStudiesByID = (state: RootState) => state.studies.itemsByID as ItemsByID<Study>
export const selectTaxonsByID = (state: RootState) => state.taxons.itemsByID as ItemsByID<Taxon>
export const selectToken = (state: RootState) => state.auth.tokens.access
export const selectUsersByID = (state: RootState) => state.users.itemsByID as ItemsByID<User>
export const selectWorkflowsByID = (state: RootState) => state.workflows.itemsByID as ItemsByID<Workflow>
