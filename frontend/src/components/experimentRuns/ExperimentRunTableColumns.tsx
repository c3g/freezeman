import React from "react";
import { ExperimentRun } from "../../models/frontend_models";
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns";
import { FilterDescription } from "../../models/paged_items";
import { FILTER_TYPE } from "../../constants";
import { UNDEFINED_FILTER_KEY } from "../pagedItemsTable/PagedItemsFilters";
import ExperimentRunLaunchCard from "./ExperimentRunLaunchCard";
import { WithContainerRenderComponent } from "../shared/WithItemRenderComponent";
import { Link } from "react-router-dom";
import { Tag } from "antd";
import { selectExperimentRunLaunches, selectInstrumentsByID, selectRunTypesByID } from "../../selectors";

export interface ObjectWithExperimentRun {
    experimentRun: ExperimentRun
}
export type ExperimentRunColumn = IdentifiedTableColumnType<ObjectWithExperimentRun>
export enum ExperimentRunColumnID {
    ID = 'ID',
    NAME = "NAME",
    RUN_TYPE = "RUN_TYPE",
    INSTRUMENT = "INSTRUMENT",
    INSTRUMENT_TYPE = "INSTRUMENT_TYPE",
    CONTAINER_BARCODE = "CONTAINER_BARCODE",
    START_DATE = "START_DATE",
    LAUNCH = "LAUNCH"
}

export function getColumnsForExperimentRun(
    launchesById: ReturnType<typeof selectExperimentRunLaunches>['launchesById'],
    runTypesById: ReturnType<typeof selectRunTypesByID>,
    instrumentsById: ReturnType<typeof selectInstrumentsByID>,
): ExperimentRunColumn[] {
    const columnDefinitions = EXPERIMENT_RUN_COLUMN_DEFINITIONS(launchesById, runTypesById, instrumentsById)
    return [
        columnDefinitions.ID,
        columnDefinitions.NAME,
        columnDefinitions.RUN_TYPE,
        columnDefinitions.INSTRUMENT,
        columnDefinitions.INSTRUMENT_TYPE,
        columnDefinitions.CONTAINER_BARCODE,
        columnDefinitions.START_DATE,
        columnDefinitions.LAUNCH,
    ]
}


const MEDIUM_COLUMN_WIDTH = 150
const LARGE_COLUMN_WIDTH = 270

export const EXPERIMENT_RUN_COLUMN_DEFINITIONS = (
    launchesById: ReturnType<typeof selectExperimentRunLaunches>['launchesById'],
    runTypesById: ReturnType<typeof selectRunTypesByID>,
    instrumentsById: ReturnType<typeof selectInstrumentsByID>,
): { [key in ExperimentRunColumnID]: ExperimentRunColumn } => ({
    [ExperimentRunColumnID.ID]: {
        columnID: ExperimentRunColumnID.ID,
        title: 'ID',
        dataIndex: ['experimentRun', 'id'],
        sorter: { multiple: 1 },
        width: 65,
        align: 'center',
        render: (_, { experimentRun }) => {
            return (experimentRun.id &&
                <Link to={`/experiment-runs/${experimentRun.id}`}>
                    {experimentRun.id}
                </Link>)
        }
    },
    [ExperimentRunColumnID.NAME]: {
        columnID: ExperimentRunColumnID.NAME,
        title: 'Name',
        dataIndex: ['experimentRun', 'name'],
        sorter: { multiple: 1 },
        width: LARGE_COLUMN_WIDTH,
        render: (_, { experimentRun }) => {
            return <div>{experimentRun.name}</div>
        }
    },
    [ExperimentRunColumnID.RUN_TYPE]: {
        columnID: ExperimentRunColumnID.RUN_TYPE,
        title: 'Run Type',
        dataIndex: ['experimentRun', 'run_type'],
        sorter: { multiple: 1 },
        width: MEDIUM_COLUMN_WIDTH,
        render: (_, { experimentRun }) => {
            return <Tag variant={"outlined"}>{runTypesById[experimentRun.run_type]?.name}</Tag>
        }
    },
    [ExperimentRunColumnID.INSTRUMENT]: {
        columnID: ExperimentRunColumnID.INSTRUMENT,
        title: 'Instrument',
        dataIndex: ['experimentRun', 'instrument'],
        sorter: { multiple: 1 },
        width: MEDIUM_COLUMN_WIDTH,
        render: (_, { experimentRun }) => {
            return <div>{instrumentsById[experimentRun.instrument]?.name}</div>
        }
    },
    [ExperimentRunColumnID.INSTRUMENT_TYPE]: {
        columnID: ExperimentRunColumnID.INSTRUMENT_TYPE,
        title: 'Instrument Type',
        dataIndex: ['experimentRun', 'instrument_type'],
        sorter: { multiple: 1 },
        width: MEDIUM_COLUMN_WIDTH,
        render: (_, { experimentRun }) => {
            return <div>{experimentRun.instrument_type}</div>
        }
    },
    [ExperimentRunColumnID.CONTAINER_BARCODE]: {
        columnID: ExperimentRunColumnID.CONTAINER_BARCODE,
        title: 'Container Barcode',
        dataIndex: ['experimentRun', 'container_barcode'],
        sorter: { multiple: 1 },
        width: MEDIUM_COLUMN_WIDTH,
        render: (_, { experimentRun }) => {
            return (experimentRun.container &&
                <Link to={`/containers/${experimentRun.container}`}>
                    <WithContainerRenderComponent objectID={experimentRun.container} placeholder={'loading...'} render={container => <span>{container.barcode}</span>} />
                </Link>)
        }
    },
    [ExperimentRunColumnID.START_DATE]: {
        columnID: ExperimentRunColumnID.START_DATE,
        title: 'Start date',
        dataIndex: ['experimentRun', 'start_date'],
        sorter: { multiple: 1 },
        width: 90,
        align: 'center',
        render: (_, { experimentRun }) => {
            return <div>{experimentRun.start_date}</div>
        }
    },
    [ExperimentRunColumnID.LAUNCH]: {
        columnID: ExperimentRunColumnID.LAUNCH,
        title: 'Launch',
        dataIndex: ['experimentRun', 'launch'],
        width: 150,
        render: (_, { experimentRun }) => {
            return (<div>
                {
                    runTypesById && runTypesById[experimentRun.run_type] && runTypesById[experimentRun.run_type].needs_run_processing &&
                    <ExperimentRunLaunchCard experimentRun={experimentRun} experimentRunLaunch={launchesById[experimentRun.id]} />
                }
            </div>)
        }
    }

})

export enum ExperimentRunFilterID {
    ID = ExperimentRunColumnID.ID,
    NAME = ExperimentRunColumnID.NAME,
    RUN_TYPE = ExperimentRunColumnID.RUN_TYPE,
    INSTRUMENT = ExperimentRunColumnID.INSTRUMENT,
    INSTRUMENT_TYPE = ExperimentRunColumnID.INSTRUMENT_TYPE,
    CONTAINER_BARCODE = ExperimentRunColumnID.CONTAINER_BARCODE,
    START_DATE = ExperimentRunColumnID.START_DATE,
}

export const EXPERIMENT_RUN_FILTER_DEFINITIONS: { [key in ExperimentRunFilterID]: FilterDescription } = {
    [ExperimentRunFilterID.ID]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "ExperimentRun ID",
    },
    [ExperimentRunFilterID.NAME]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Name",
    },
    [ExperimentRunFilterID.RUN_TYPE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Run Type",
    },
    [ExperimentRunFilterID.INSTRUMENT]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Instrument",
    },
    [ExperimentRunFilterID.INSTRUMENT_TYPE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Instrument Type",
    },
    [ExperimentRunFilterID.CONTAINER_BARCODE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Container Barcode",
    },
    [ExperimentRunFilterID.START_DATE]: {
        type: FILTER_TYPE.DATE_RANGE,
        key: UNDEFINED_FILTER_KEY,
        label: "Start Date",
    }
}

export const EXPERIMENT_RUN_FILTER_KEYS: { [key in ExperimentRunFilterID]: string } = {
    [ExperimentRunFilterID.ID]: 'id',
    [ExperimentRunFilterID.NAME]: 'name',
    [ExperimentRunFilterID.RUN_TYPE]: 'run_type__name',
    [ExperimentRunFilterID.INSTRUMENT]: 'instrument__name',
    [ExperimentRunFilterID.INSTRUMENT_TYPE]: 'instrument__type__type',
    [ExperimentRunFilterID.CONTAINER_BARCODE]: 'container__barcode',
    [ExperimentRunFilterID.START_DATE]: 'start_date',
}