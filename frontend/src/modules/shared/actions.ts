import Containers from "../containers/actions"
import ContainersTableActions from '../containersTable/actions'
import ExperimentRunTableActions from '../experimentRunsTable/actions'
import Coordinates from "../coordinates/actions"
import DatasetFiles from "../datasetFiles/actions"
import Datasets from "../datasets/actions"
import ExperimentRuns from "../experimentRuns/actions"
import Groups from "../groups"
import Indices from "../indices/actions"
import IndividualsTableActions from '../individualsTable/actions'
import { refreshLabwork } from "../labwork/actions"
import * as SampleNextStep from '../labworkSteps/actions'
import Libraries from "../libraries/actions"
import LibrariesTableActions from '../librariesTable/actions'
import LibraryTypes from "../libraryTypes/actions"
import ProcessMeasurements from "../processMeasurements/actions"
import Projects from "../projects/actions"
import ProjectsTableActions from '../projectsTable/actions'
import Protocols from "../protocols/actions"
import ReferenceGenomes from "../referenceGenomes/actions"
import Samples from "../samples/actions"
import SamplesTableActions from '../samplesTable/actions'
import Steps from '../steps/actions'
import { refreshAllStudySamples } from "../studySamples/actions"
import Taxons from "../taxons/actions"
import Users from "../users/actions"
import Workflows from "../workflows/actions"
import IndicesTableActions from '../indicesTable/actions'


export const fetchSummariesData = () => async (dispatch) => {
    await Promise.all([
        Containers.summary,
        Indices.summary,
        Samples.summary,
        LibraryTypes.list,
        Libraries.summary,
        Projects.summary,
        ProcessMeasurements.summary,
    ].map(a => dispatch(a())))
};

export const fetchLabworkSummary = () => async (dispatch) => {
    const labworkChanged = await dispatch(refreshLabwork())
    if (labworkChanged === true) {
        dispatch(refreshAllStudySamples())
    }
}
export const fetchStaticData = () => async (dispatch) => {
    await Promise.allSettled([
        Coordinates.list,
        Containers.listKinds,
        ExperimentRuns.listInstrumentTypes,
        ExperimentRuns.listInstruments,
        ExperimentRuns.listTypes,
        Samples.listKinds,
        LibraryTypes.list,
        Protocols.list,
        Users.list,
        Groups.list,
        Taxons.list,
        ReferenceGenomes.list,
        Steps.list,
        Workflows.list,
    ].map(a => dispatch(a())))

    // Lower priority
    await Promise.allSettled([
        Containers.listTemplateActions,
        Indices.listTemplateActions,
        Samples.listTemplateActions,
        Libraries.listTemplateActions,
        ProcessMeasurements.listTemplateActions,
        ExperimentRuns.listTemplateActions,
        Projects.listTemplateActions,
        SampleNextStep.listTemplateActions,
        Samples.listPrefillTemplates,
        Libraries.listPrefillTemplates,
        Containers.listPrefillTemplates,
    ].map(a => dispatch(a())))
}
export const fetchListedData = () => async (dispatch) => {
    // Higher priority
    await Promise.all([
        ContainersTableActions.refreshPage,
        ExperimentRunTableActions.refreshPage,
        IndicesTableActions.refreshPage,
        IndividualsTableActions.refreshPage,
        SamplesTableActions.refreshPage,
        LibrariesTableActions.refreshPage,
        ProjectsTableActions.refreshPage,
        ProcessMeasurements.listTable,
        Protocols.list,
        Datasets.listTable,
        DatasetFiles.listTable,
    ].map(a => dispatch(a())))
}
