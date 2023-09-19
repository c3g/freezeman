import {
	Container,
	Coordinate,
	Dataset,
	DatasetFile,
	ExperimentRun,
	Index,
	Instrument,
	ItemsByID,
	Library,
	Process,
	ProcessMeasurement,
	Project,
	PropertyValue,
	Protocol,
	ReferenceGenome,
	RunType,
	Sample,
	SampleKind,
	Sequence,
	Study,
	Taxon,
	User,
	Workflow,
} from './models/frontend_models'
import { PagedItems } from './models/paged_items'
import { IndividualDetailsById } from './modules/individualDetails/models'
import { LabworkSummaryState } from './modules/labwork/reducers'
import { LabworkStepsState } from './modules/labworkSteps/models'
import { ProjectSamplesTable } from './modules/projectSamplesTable/reducers'
import { StudySamplesByID, StudySettingsByID } from './modules/studySamples/models'
import { RootState } from './store'

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

export const selectAppInitialized = (state: RootState) => state.app.initialized
export const selectAuthState = (state: RootState) => state.auth
export const selectAuthTokenAccess = (state: RootState) => state.auth?.tokens?.access as unknown as string | undefined
export const selectAuthCurrentUserID = (state: RootState) => state.auth?.currentUserID as unknown as string | undefined
export const selectContainerKindsByID = (state: RootState) => state.containerKinds.itemsByID
export const selectContainerPrefillTemplates = (state: RootState) => state.containerPrefillTemplates
export const selectContainersByID = (state: RootState) => state.containers.itemsByID as ItemsByID<Container>
export const selectContainersTable = (state: RootState) => state.containersTable
export const selectContainerTemplateActions = (state: RootState) => state.containerTemplateActions
export const selectCoordinatesByID = (state: RootState) => state.coordinates.itemsByID as ItemsByID<Coordinate>
export const selectDatasetFilesByID = (state: RootState) => state.datasetFiles.itemsByID as ItemsByID<DatasetFile>
export const selectDatasetFilesState = (state: RootState) => state.datasetFiles
export const selectDatasetsByID = (state: RootState) => state.datasets.itemsByID as ItemsByID<Dataset>
export const selectDatasetsState = (state: RootState) => state.datasets
export const selectExperimentRunLanesState = (state: RootState) => state.experimentRunLanes
export const selectExperimentRunsByID = (state: RootState) => state.experimentRuns.itemsByID as ItemsByID<ExperimentRun>
export const selectExperimentRunsState = (state: RootState) => state.experimentRuns
export const selectExperimentRunsTemplateActions = (state: RootState) => state.experimentRunTemplateActions
export const selectExternalExperimentRuns = (state: RootState) => state.externalExperimentRuns.runs
export const selectExternalExperimentRunsState = (state: RootState) => state.externalExperimentRuns
export const selectGroupsByID = (state: RootState) => state.groups.itemsByID
export const selectHideEmptySteps = (state: RootState) => state.studySamples.hideEmptySteps
export const selectIndicesByID = (state: RootState) => state.indices.itemsByID as ItemsByID<Index>
export const selectIndicesTable = (state: RootState) => state.indicesTable
export const selectIndicesTemplateActions = (state: RootState) => state.indicesTemplateActions
export const selectIndividualsByID = (state: RootState) => state.individuals.itemsByID
export const selectIndividualsDetailsById = (state: RootState) => state.individualDetails as IndividualDetailsById
export const selectIndividualsTable = (state: RootState) => state.individualsTable
export const selectInstrumentsByID = (state: RootState) => state.instruments.itemsByID as ItemsByID<Instrument>
export const selectLabworkStepsState = (state: RootState) => state.labworkSteps as LabworkStepsState
export const selectLabworkSummaryState = (state: RootState) => state.labworkSummary as LabworkSummaryState
export const selectLibrariesByID = (state: RootState) => state.libraries.itemsByID as ItemsByID<Library>
export const selectLibrariesTable = (state: RootState) => state.librariesTable
export const selectLibraryPrefillTemplates = (state: RootState) => state.libraryPrefillTemplates
export const selectLibraryTemplateActions = (state: RootState) => state.libraryTemplateActions
export const selectPageSize = (state: RootState) => state.pagination.pageSize
export const selectProcessesByID = (state: RootState) => state.processes.itemsByID as ItemsByID<Process>
export const selectProcessMeasurementsByID = (state: RootState) => state.processMeasurements.itemsByID as ItemsByID<ProcessMeasurement>
export const selectProcessMeasurementTemplateActions = (state: RootState) => state.processMeasurementTemplateActions
export const selectProjectSamplesTable = (state: RootState) => state.projectSamplesTable as ProjectSamplesTable
export const selectProjectsByID = (state: RootState) => state.projects.itemsByID as ItemsByID<Project>
export const selectProjectsOfSamples = (state: RootState) => state.projectsOfSamples
export const selectProjectsState = (state: RootState) => state.projects
export const selectProjectsTable = (state: RootState) => state.projectsTable as PagedItems
export const selectProjectTemplateActions = (state: RootState) => state.projectTemplateActions
export const selectPropertyValuesByID = (state: RootState) => state.propertyValues.itemsByID as ItemsByID<PropertyValue>
export const selectProtocolsByID = (state: RootState) => state.protocols.itemsByID as ItemsByID<Protocol>
export const selectReferenceGenomesByID = (state: RootState) => state.referenceGenomes.itemsByID as ItemsByID<ReferenceGenome>
export const selectRunTypesByID = (state: RootState) => state.runTypes.itemsByID as ItemsByID<RunType>
export const selectSampleKindsByID = (state: RootState) => state.sampleKinds.itemsByID as ItemsByID<SampleKind>
export const selectSampleKindsState = (state: RootState) => state.sampleKinds
export const selectSampleNextStepTemplateActions = (state: RootState) => state.sampleNextStepTemplateActions.items
export const selectSamplePrefillTemplates = (state: RootState) => state.samplePrefillTemplates
export const selectSamplesByID = (state: RootState) => state.samples.itemsByID as ItemsByID<Sample>
export const selectSamplesTable = (state: RootState) => state.samplesTable
export const selectSampleTemplateActions = (state: RootState) => state.sampleTemplateActions
export const selectSequencesByID = (state: RootState) => state.sequences.itemsByID as ItemsByID<Sequence>
export const selectStepsByID = (state: RootState) => state.steps.itemsByID
export const selectStudiesByID = (state: RootState) => state.studies.itemsByID as ItemsByID<Study>
export const selectStudySamplesByID = (state: RootState) => state.studySamples.studySamplesByID as StudySamplesByID
export const selectStudySettingsByID = (state: RootState) => state.studySamples.studySettingsByID as StudySettingsByID
export const selectTaxonsByID = (state: RootState) => state.taxons.itemsByID as ItemsByID<Taxon>
export const selectTaxonsTable = (state: RootState) => state.taxonsTable
export const selectToken = (state: RootState) => state.auth.tokens.access as unknown as string | null
export const selectUsersByID = (state: RootState) => state.users.itemsByID as ItemsByID<User>
export const selectUsersState = (state: RootState) => state.users
export const selectUsersTable = (state: RootState) => state.usersTable
export const selectWorkflowsByID = (state: RootState) => state.workflows.itemsByID as ItemsByID<Workflow>
