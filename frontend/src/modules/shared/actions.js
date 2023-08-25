import Containers from "../containers/actions";
import Indices from "../indices/actions";
import Individuals from "../individuals/actions";
import Users from "../users/actions";
import Groups from "../groups";
import Coordinates from "../coordinates/actions"
import Samples from "../samples/actions";
import Libraries from "../libraries/actions";
import LibraryTypes from "../libraryTypes/actions";
import ProcessMeasurements from "../processMeasurements/actions";
import Projects from "../projects/actions";
import Protocols from "../protocols/actions";
import ExperimentRuns from "../experimentRuns/actions";
import Taxons from "../taxons/actions";
import ReferenceGenomes from "../referenceGenomes/actions"
import Datasets from "../datasets/actions";
import DatasetFiles from "../datasetFiles/actions"
import Workflows from "../workflows/actions"
import Steps from '../steps/actions'
import * as SampleNextStep from '../labworkSteps/actions'
import { refreshLabwork } from "../labwork/actions";
import { refreshAllStudySamples } from "../studySamples/actions";
import ProjectsTableActions from '../projectsTable/actions'
import SamplesTableActions from '../samplesTable/actions'
import ContainersTableActions from '../containersTable/actions'


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
        ExperimentRuns.listInstruments,
        ExperimentRuns.listTypes,
        Samples.listKinds,
        LibraryTypes.list,
        Protocols.list,
        Users.listTable,
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
        ExperimentRuns.listTable,
        Indices.listTable,
        Individuals.listTable,
        SamplesTableActions.refreshPage,
        Libraries.listTable,
        ProjectsTableActions.refreshPage,
        ProcessMeasurements.listTable,
        Protocols.list,
        Datasets.listTable,
        DatasetFiles.listTable,
    ].map(a => dispatch(a())))
}
