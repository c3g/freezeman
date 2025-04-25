import { Descriptions, Spin } from "antd"
import React, { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from '../../hooks'
import { get } from "../../modules/datasets/actions"
import { selectDatasetsByID } from "../../selectors"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { Dataset } from "../../models/frontend_models"
import { ValidationStatus } from "../../modules/experimentRunLanes/models"
import api from "../../utils/api"
import LaneValidationStatus from "../experimentRuns/LaneValidationStatus"
import ReadsetsListContent from "../readsets/ReadsetsListContent"


const DatasetDetailContent = () => {
    const datasetsById = useAppSelector(selectDatasetsByID)
    const dispatch = useAppDispatch()
    const { id: datasetId } = useParams();
    const dataset: Dataset | undefined = datasetId ? datasetsById[datasetId] : undefined
    const [laneValidationStatus, setLaneValidationStatus] = useState<ValidationStatus>()
    useEffect(() => {
        if (!dataset) {
            dispatch(get(datasetId))
        }
    }, [dataset, datasetId, datasetsById, dispatch])

    useEffect(() => {
        async function fetchLaneValidationStatus(dataset: Dataset) {
            const status = await dispatch(api.experimentRuns.getLaneValidationStatus(dataset.experiment_run_id, dataset.lane))
            return status.data
        }

        if (dataset && !dataset.isFetching && !laneValidationStatus) {
            fetchLaneValidationStatus(dataset).then((status) => {
                setLaneValidationStatus(status)
            })
        }
    }, [dataset, laneValidationStatus, dispatch])

    const loading = (value: any) => {
        return value ?? "Loading..."
    }

    const refreshDataset = useCallback(async () => {
        if (datasetId) {
            await dispatch(get(datasetId))
        }
    }, [datasetId, dispatch])

    return <>
        <AppPageHeader
            title={`Dataset ${loading(dataset?.external_project_id)} - ${loading(dataset?.run_name)} - ${loading(dataset?.lane)}`}
        />

        <PageContent>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5em'
            }}>
                <Descriptions bordered={true} size={"small"} column={4}>
                    <Descriptions.Item label={"ID"} span={1}>{loading(dataset?.id)}</Descriptions.Item>
                    <Descriptions.Item label={"Project"} span={1}>
                        {dataset ? <Link to={`/projects/${dataset.project_id}`}>{dataset.project_name}</Link> : 'Loading...'}
                    </Descriptions.Item>
                    <Descriptions.Item label={"Run Name"} span={2}>
                        {dataset ? <Link to={`/experiment-runs/${dataset.experiment_run_id}`}>{dataset.run_name}</Link> : 'Loading...'}
                    </Descriptions.Item>
                    <Descriptions.Item label={"Lane"} span={1}>{loading(dataset?.lane)}</Descriptions.Item>
                    <Descriptions.Item label={"Lane Validation Status"} span={1}>{laneValidationStatus !== undefined &&
                        <LaneValidationStatus validationStatus={laneValidationStatus} isValidationInProgress={false} />}
                    </Descriptions.Item>
                    <Descriptions.Item label={"Run Metrics Report"} span={2}>
                        {dataset?.metric_report_url ?
                            <Link to={dataset.metric_report_url} rel="external noopener noreferrer" target="_blank">View Run Metrics</Link>
                            :
                            <span>Unavailable</span>
                        }
                    </Descriptions.Item>
                    <Descriptions.Item label={"Total Readsets"} span={1}>{loading(dataset?.readset_count)}</Descriptions.Item>
                    <Descriptions.Item label={"Readsets Released"} span={1}>{loading(dataset?.released_status_count)}</Descriptions.Item>
                </Descriptions>
                {dataset && laneValidationStatus !== undefined
                    ? <ReadsetsListContent dataset={dataset} laneValidationStatus={laneValidationStatus} refreshDataset={refreshDataset} />
                    : <Spin />}
            </div>
        </PageContent>
    </>
}

export default DatasetDetailContent;
