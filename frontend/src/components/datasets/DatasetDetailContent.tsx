import { Button, Descriptions, Space, Typography } from "antd"
import moment from "moment"
import React, { useCallback, useEffect, useReducer, useState } from "react"
import { useParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from '../../hooks'
import useFilteredList from "../../hooks/useFilteredList"
import { listFilter, update } from "../../modules/datasetFiles/actions"
import { get, setReleaseStatus } from "../../modules/datasets/actions"
import { selectDatasetFilesByID, selectDatasetFilesState, selectDatasetsByID } from "../../selectors"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { DATASET_FILE_FILTERS } from "../filters/descriptions"
import PaginatedList from "../shared/PaginatedList"
import { Dataset, DatasetFile } from "../../models/frontend_models"
import { ValidationStatus } from "../../modules/experimentRunLanes/models"
import api from "../../utils/api"
import { InfoCircleOutlined } from "@ant-design/icons"
import LaneValidationStatus from "../experimentRuns/LaneValidationStatus"
import ReadsetsListContent from "../readsets/ReadsetsListContent"
const { Title, Text } = Typography


const DatasetDetailContent = () => {
    const datasetsById = useAppSelector(selectDatasetsByID)
    const dispatch = useAppDispatch()
    const { id: datasetId } = useParams();
    const dataset: Dataset | undefined = datasetsById[datasetId!];
    const [laneValidationStatus, setLaneValidationStatus] = useState<ValidationStatus>()
    useEffect(() => {
        if (!dataset) {
            dispatch(get(datasetId))
        }
    }, [dataset, datasetId, datasetsById, dispatch])

    useEffect(() => {
        async function fetchLaneValidationStatus(dataset: Dataset) {
            const status = await dispatch(api.experimentRuns.getLaneValidationStatus(dataset.run_name, dataset.lane))
            return status.data
        }

        if (dataset && !dataset.isFetching && !laneValidationStatus) {
            fetchLaneValidationStatus(dataset).then((status) => {
                setLaneValidationStatus(status)
            })
        }
    }, [dataset, laneValidationStatus, dispatch])

    const loading = (value: string | number | undefined) => {
        return value ?? "Loading..."
    }

    return <>
        <AppPageHeader
            title={`Dataset ${loading(dataset?.external_project_id)} - ${loading(dataset?.run_name)} - ${loading(dataset?.lane)}`}
        />

        <PageContent>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2em'
            }}>
                <Descriptions bordered={true} size={"small"} column={4}>
                    <Descriptions.Item label={"ID"} span={1}>{loading(dataset?.id)}</Descriptions.Item>
                    <Descriptions.Item label={"Project"} span={1}>{loading(dataset?.project_name)}</Descriptions.Item>
                    <Descriptions.Item label={"Run Name"} span={2}>{loading(dataset?.run_name)}</Descriptions.Item>
                    <Descriptions.Item label={"Lane"} span={1}>{loading(dataset?.lane)}</Descriptions.Item>
                    <Descriptions.Item label={"Lane Validation Status"} span={1}>{laneValidationStatus !== undefined &&
                        <LaneValidationStatus validationStatus={laneValidationStatus} isValidationInProgress={false} />}
                    </Descriptions.Item>
                    <Descriptions.Item label={"Run Metrics Report"} span={2}>
                        {dataset?.metric_report_url ?
                            <a href={dataset.metric_report_url} rel="external noopener noreferrer" target="_blank">View Run Metrics</a>
                            :
                            <span>Unavailable</span>
                        }
                    </Descriptions.Item>
                    <Descriptions.Item label={"Total Readsets"} span={1}>{loading(dataset?.files?.length)}</Descriptions.Item>
                    <Descriptions.Item label={"Readsets Released"} span={1}>{loading(dataset?.released_status_count)}</Descriptions.Item>
                </Descriptions>
                <ReadsetsListContent dataset={dataset} laneValidationStatus={laneValidationStatus}/>
            </div>
        </PageContent>
    </>
}

export default DatasetDetailContent;
