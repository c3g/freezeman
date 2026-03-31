import Containers from "../containers/actions"
import Coordinates from "../coordinates/actions"
import ExperimentRuns from "../experimentRuns/actions"
import Groups from "../groups"
import Indices from "../indices/actions"
import { refreshLabwork } from "../labwork/actions"
import * as SampleNextStep from '../labworkSteps/actions'
import Libraries from "../libraries/actions"
import LibraryTypes from "../libraryTypes/actions"
import ProcessMeasurements from "../processMeasurements/actions"
import Projects from "../projects/actions"
import Protocols from "../protocols/actions"
import ReferenceGenomes from "../referenceGenomes/actions"
import Samples from "../samples/actions"
import Steps from '../steps/actions'
import { refreshAllStudySamples } from "../studySamples/actions"
import Taxons from "../taxons/actions"
import Users from "../users/actions"
import Workflows from "../workflows/actions"

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
