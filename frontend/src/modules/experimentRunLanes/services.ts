import store from "../../store"
import api from "../../utils/api"
import { DatasetInfo, ExperimentRunLanes, ValidationStatus } from "./models"



import { Dataset } from "../../models/frontend_models"


export async function loadExperimentRunLanes(experimentRunName: string) {
    /*
        Request all the datasets associated with the experiment run.
        Group them by lane number.
        Determine the list of lanes for the experiment.
        For each lane:
            Request the validation status for the lane
    */
    // Request all of the datasets associated with the experiment run
    const datasetOptions = {
        run_name: experimentRunName
    }
    const response = await store.dispatch(api.datasets.list(datasetOptions))
    const datasets = response.data.results as Dataset[]

    // Use a Map to group the datasets by lane 
    const datasetsByLane = datasets.reduce((map, dataset) => {
        const laneNumber = dataset.lane
        if (!map.has(laneNumber)) {
            map.set(laneNumber, [])
        }
        const datasetInfo: DatasetInfo = {
            datasetID: dataset.id,
            metricsURL: dataset.metric_report_url
        }
        map.get(laneNumber)?.push(datasetInfo)
        return map
    }, new Map<number, DatasetInfo[]>())


    const experimentRunLanes: ExperimentRunLanes = {
        experimentRunName,
        lanes: []
    }
    // Process each lane
    for (const [laneNumber, datasets] of datasetsByLane) {
        // Request the validation status for the lane
        const validationResponse = await store.dispatch(api.experimentRuns.getLaneValidationStatus(experimentRunName, laneNumber))
        const statusString = validationResponse.data as string
        // if (!(statusString in ValidationStatus)) {
        //     throw new Error(`Unexpected lane validation value received from server: ${statusString}. Experiment run name: ${experimentRunName}. Lane: ${laneNumber}`)
        // }
        // TODO : the backend is returning an empty string for the validation status, so temporarily set the status to AVAILABLE until the problem is resolved
        const validationStatus : ValidationStatus = (statusString in ValidationStatus) ? ValidationStatus[statusString] : ValidationStatus.AVAILABLE

        // Create an ExperimentRunLane instance
        experimentRunLanes.lanes.push({
            runName: experimentRunName,
            laneNumber,
            validationStatus,
            datasets
        })
    }
    
    return experimentRunLanes
}

export async function fetchReadsPerSample(runName : string, lane: number) {
    const response = await store.dispatch(api.metrics.getReadsPerSampleForLane(runName, lane))
    if (response.ok) {
        console.log(response)
    }
}