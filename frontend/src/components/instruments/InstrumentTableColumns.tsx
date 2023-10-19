import React from "react";
import { FILTER_TYPE } from "../../constants";
import { Instrument } from "../../models/frontend_models";
import { FilterDescription } from "../../models/paged_items";
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns";
import { UNDEFINED_FILTER_KEY } from "../pagedItemsTable/PagedItemsFilters";
import { Tag } from "antd";

export interface ObjectWithInstrument {
    instrument: Instrument
}

enum InstrumentColumnID {
    ID = 'ID',
    NAME = 'NAME',
    SERIAL_ID = 'SERIAL_ID',
    TYPE = 'TYPE'
}

type InstrumentColumn = IdentifiedTableColumnType<ObjectWithInstrument>

export function getColumnsForInstruments(instrumentTypesById) {
    const columnDefinitions = INSTRUMENT_COLUMN_DEFINITIONS(instrumentTypesById)
    return [
        columnDefinitions.ID,
        columnDefinitions.NAME,
        columnDefinitions.SERIAL_ID,
        columnDefinitions.TYPE
    ]
}

export const INSTRUMENT_COLUMN_DEFINITIONS = (instrumentTypesById): { [key in InstrumentColumnID]: InstrumentColumn } => ({
    [InstrumentColumnID.ID]: {
        columnID: InstrumentColumnID.ID,
        title: 'ID',
        dataIndex: ['instrument', 'id'],
        render: (_, { instrument }) => {
            return <div>{instrument.id}</div>
        }
    },
    [InstrumentColumnID.NAME]: {
        columnID: InstrumentColumnID.NAME,
        title: 'Name',
        dataIndex: ['instrument', 'name'],
        render: (_, { instrument }) => {
            return <div>{instrument.name}</div>
        }
    },
    [InstrumentColumnID.SERIAL_ID]: {
        columnID: InstrumentColumnID.SERIAL_ID,
        title: 'Serial ID',
        dataIndex: ['instrument', 'serial_id'],
        render: (_, { instrument }) => {
            return <div>{instrument.serial_id}</div>
        }
    },
    [InstrumentColumnID.TYPE]: {
        columnID: InstrumentColumnID.TYPE,
        title: 'Type',
        dataIndex: ['instrument', 'type'],
        render: (_, { instrument }) => {
            return <Tag>{instrumentTypesById[instrument.type]?.type}</Tag>
        }
    }
})
enum InstrumentFilterID {
    ID = InstrumentColumnID.ID,
    NAME = InstrumentColumnID.NAME,
    SERIAL_ID = InstrumentColumnID.SERIAL_ID,
    TYPE = InstrumentColumnID.TYPE
}

export const INSTRUMENT_FILTER_DEFINITIONS: { [key in InstrumentFilterID]: FilterDescription } = {
    [InstrumentColumnID.ID]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "Instrument ID"
    },
    [InstrumentColumnID.NAME]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Name"
    },
    [InstrumentColumnID.SERIAL_ID]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Serial ID"
    },
    [InstrumentColumnID.TYPE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Type"
    }
}

export const INSTRUMENT_FILTER_KEYS: { [key in InstrumentFilterID]: string } = {
    [InstrumentFilterID.ID]: 'id',
    [InstrumentFilterID.NAME]: 'name',
    [InstrumentFilterID.SERIAL_ID]: 'serial_id',
    [InstrumentFilterID.TYPE]: 'type__type'
}