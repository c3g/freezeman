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

export function getColumnsForExperimentRun(launchesById, runTypesById, instrumentsById): ExperimentRunColumn[] {
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


export const EXPERIMENT_RUN_COLUMN_DEFINITIONS = (launchesById, runTypesById, instrumentsById): { [key in ExperimentRunColumnID]: ExperimentRunColumn } => ({
    [ExperimentRunColumnID.ID]: {
        columnID: ExperimentRunColumnID.ID,
        title: 'ID',
        dataIndex: ['experimentRun', 'id'],
        sorter: true,
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
        sorter: true,
        render: (_, { experimentRun }) => {
            return <div>{experimentRun.name}</div>
        }
    },
    [ExperimentRunColumnID.RUN_TYPE]: {
        columnID: ExperimentRunColumnID.RUN_TYPE,
        title: 'Run Type',
        dataIndex: ['experimentRun', 'run_type'],
        sorter: true,
        render: (_, { experimentRun }) => {
            return <Tag>{runTypesById[experimentRun.run_type]?.name}</Tag>
        }
    },
    [ExperimentRunColumnID.INSTRUMENT]: {
        columnID: ExperimentRunColumnID.INSTRUMENT,
        title: 'Instrument',
        dataIndex: ['experimentRun', 'instrument'],
        sorter: true,
        render: (_, { experimentRun }) => {
            return <div>{instrumentsById[experimentRun.instrument]?.name}</div>
        }
    },
    [ExperimentRunColumnID.INSTRUMENT_TYPE]: {
        columnID: ExperimentRunColumnID.INSTRUMENT_TYPE,
        title: 'Instrument Type',
        dataIndex: ['experimentRun', 'instrument_type'],
        sorter: true,
        render: (_, { experimentRun }) => {
            return <div>{experimentRun.instrument_type}</div>
        }
    },
    [ExperimentRunColumnID.CONTAINER_BARCODE]: {
        columnID: ExperimentRunColumnID.CONTAINER_BARCODE,
        title: 'Container Barcode',
        dataIndex: ['experimentRun', 'container_barcode'],
        sorter: true,
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
        sorter: true,
        render: (_, { experimentRun }) => {
            return <div>{experimentRun.start_date}</div>
        }
    },
    [ExperimentRunColumnID.LAUNCH]: {
        columnID: ExperimentRunColumnID.LAUNCH,
        title: 'Launch',
        dataIndex: ['experimentRun', 'launch'],
        sorter: true,
        width: 180,
        render: (_, { experimentRun }) => {
            return (<div>
                <ExperimentRunLaunchCard experimentRun={experimentRun} experimentRunLaunch={launchesById[experimentRun.id]} />
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
    LAUNCH = ExperimentRunColumnID.LAUNCH
}

export const EXPERIMENT_RUN_FILTER_DEFINITIONS: { [key in ExperimentRunColumnID]: FilterDescription } = {
    [ExperimentRunColumnID.ID]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "ExperimentRun ID",
    },
    [ExperimentRunColumnID.NAME]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Name",
    },
    [ExperimentRunColumnID.RUN_TYPE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Run Type",
    },
    [ExperimentRunColumnID.INSTRUMENT]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Instrument",
    },
    [ExperimentRunColumnID.INSTRUMENT_TYPE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Instrument Type",
    },
    [ExperimentRunColumnID.CONTAINER_BARCODE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Container Barcode",
    },
    [ExperimentRunColumnID.START_DATE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Start Date",
    },
    [ExperimentRunColumnID.LAUNCH]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Launch",
    }
}

export const EXPERIMENT_RUN_FILTER_KEYS: { [key in ExperimentRunColumnID]: string } = {
    [ExperimentRunColumnID.ID]: 'id',
    [ExperimentRunColumnID.NAME]: 'name',
    [ExperimentRunColumnID.RUN_TYPE]: 'run_type',
    [ExperimentRunColumnID.INSTRUMENT]: 'instrument',
    [ExperimentRunColumnID.INSTRUMENT_TYPE]: 'instrument_type',
    [ExperimentRunColumnID.CONTAINER_BARCODE]: 'container_barcode',
    [ExperimentRunColumnID.START_DATE]: 'start_date',
    [ExperimentRunColumnID.LAUNCH]: 'launch',
}