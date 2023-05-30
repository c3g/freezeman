import store from "../../store"
import api from "../../utils/api"
import { DatasetInfo, ExperimentRunLanes, ReadsPerSample, NumberOfReads, ValidationStatus } from "./models"



import { Dataset } from "../../models/frontend_models"
import { FMSMetric } from "../../models/fms_api_models"


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
        const status = validationResponse.data as number
        
        let validationStatus = ValidationStatus.AVAILABLE
        switch(status) {
            case 1: validationStatus = ValidationStatus.PASSED; break
            case 2: validationStatus = ValidationStatus.FAILED; break
        }
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

export async function fetchReadsPerSample(runName : string, lane: number): Promise<ReadsPerSample> {
    const response = await store.dispatch(api.metrics.getReadsPerSampleForLane(runName, lane))
    if (response.ok) {
       const metrics = response.data.results as FMSMetric[]
       const sampleReads : NumberOfReads[] = metrics.map(metric => {
            return {
                derivedSampleID: metric.derived_sample_id ?? undefined,
                sampleName: metric.sample_name,
                nbReads: metric.value_numeric ?? 0  // The numeric value should always be defined for this type of metric
            }
       })  
       return {sampleReads}
    } else {
        throw new Error(`Failed to load reads per sample for lane ${lane} of run ${runName}`)
    }
}