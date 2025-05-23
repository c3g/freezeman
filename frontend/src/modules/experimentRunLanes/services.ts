import { FMSId, FMSMetric } from "../../models/fms_api_models"
import store, { AppDispatch } from "../../store"
import api from "../../utils/api"
import { DatasetInfo, ExperimentRunLanes, NumberOfReads, ReadsPerSample, ValidationStatus } from "./models"


export function loadExperimentRunLanes(experimentRunId: FMSId) {
    return async (dispatch: AppDispatch) => {
        /*
            Request all the datasets associated with the experiment run.
            Group them by lane number.
            Determine the list of lanes for the experiment.
            For each lane:
                Request the validation status for the lane
        */
        // Request all of the datasets associated with the experiment run
        const datasetOptions = {
            experiment_run: experimentRunId
        }
        const response = await dispatch(api.datasets.list(datasetOptions))
        const datasets = response.data.results

        // Use a Map to group the datasets by lane 
        const datasetsByLane = datasets.reduce((map, dataset) => {
            const laneNumber = dataset.lane
            if (!map.has(laneNumber)) {
                map.set(laneNumber, [])
            }
            const datasetInfo: DatasetInfo = {
                datasetID: dataset.id,
                metricsURL: dataset.metric_report_url,
                latestValidationTime: dataset.latest_validation_update
            }
            map.get(laneNumber)?.push(datasetInfo)
            return map
        }, new Map<number, DatasetInfo[]>())


        const experimentRunLanes: ExperimentRunLanes = {
            experimentRunId,
            lanes: []
        }
        // Process each lane
        for (const [laneNumber, datasets] of datasetsByLane) {
            // Request the validation status for the lane
            const validationResponse = await store.dispatch(api.experimentRuns.getLaneValidationStatus(experimentRunId, laneNumber))
            const status = validationResponse.data as number
            
            let validationStatus = ValidationStatus.AVAILABLE
            switch(status) {
                case 1: validationStatus = ValidationStatus.PASSED; break
                case 2: validationStatus = ValidationStatus.FAILED; break
            }

            const validationTime = datasets.reduce<string | undefined>((latest, dataset) => {
                if (dataset.latestValidationTime) {
                    if (!latest || dataset.latestValidationTime > latest) {
                        return dataset.latestValidationTime
                    }
                }
                return latest
            }, undefined)

            // Create an ExperimentRunLane instance
            experimentRunLanes.lanes.push({
                experimentRunId,
                laneNumber,
                validationStatus,
                validationTime,
                datasets,
            })
        }
        
        return experimentRunLanes
    }
}

export async function fetchReadsPerSample(experimentRunId : FMSId, lane: number): Promise<ReadsPerSample> {
    const response = await store.dispatch(api.metrics.getReadsPerSampleForLane(experimentRunId, lane))
    if (response.ok) {
       const metrics = response.data.results as FMSMetric[]
       const sampleReads : NumberOfReads[] = metrics.map(metric => {
            return {
                derivedSampleID: metric.derived_sample_id ?? undefined,
                readsetID: metric.readset_id,
                sampleName: metric.sample_name,
                nbReads: metric.value_numeric ? Number(metric.value_numeric) : 0  // The numeric value should always be defined for this type of metric
            }
       })  
       return {sampleReads}
    } else {
        throw new Error(`Failed to load reads per sample for lane ${lane} of run ${experimentRunId}`)
    }
}