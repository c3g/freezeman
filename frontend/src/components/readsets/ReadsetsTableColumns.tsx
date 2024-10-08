import React, { useMemo } from "react";
import { Readset } from "../../models/frontend_models";
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns";
import { FilterDescription } from "../../models/paged_items";
import { UNDEFINED_FILTER_KEY } from "../pagedItemsTable/PagedItemsFilters";
import { FILTER_TYPE } from "../../constants";

export interface ObjectWithReadset {
    readset: Readset
}
export type ReadsetColumn = IdentifiedTableColumnType<ObjectWithReadset>

export enum ReadsetColumnID {
    ID = 'ID',
    SAMPLE_NAME = 'SAMPLE_NAME',
    RELEASE_STATUS = 'RELEASE_STATUS',
    LIBRARY_TYPE = 'LIBRARY_TYPE',
    INDEX = 'INDEX',
    NUMBER_READS = 'NUMBER_READS',
}

function defaultRenderReleaseStatus(value: any, record: ObjectWithReadset, index: number) {
    return record.readset && record.readset.release_status ? <div> {record.readset.release_status} </div> : <></>
}

export function useReadsetColumnDefinitions({ renderReleaseStatus = defaultRenderReleaseStatus }): { [key in ReadsetColumnID]: ReadsetColumn } {
    return useMemo(() => ({
        [ReadsetColumnID.ID]: {
            columnID: ReadsetColumnID.ID,
            title: 'ID',
            dataIndex: ['readset', 'id'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && <div> {readset.id} </div>
            }
        },
        [ReadsetColumnID.SAMPLE_NAME]: {
            columnID: ReadsetColumnID.SAMPLE_NAME,
            title: "Sample name",
            dataIndex: ['readset', 'sample_name'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && <div> {readset.sample_name} </div>
            }
        },
        [ReadsetColumnID.RELEASE_STATUS]: {
            columnID: ReadsetColumnID.RELEASE_STATUS,
            title: "Release Status",
            dataIndex: ['readset', 'release_status'],
            sorter: true,
            render: renderReleaseStatus
        },
        [ReadsetColumnID.LIBRARY_TYPE]: {
            columnID: ReadsetColumnID.LIBRARY_TYPE,
            title: "Library Type",
            dataIndex: ['readset', 'library_type'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && readset.metrics && readset.library_type ? <div> {readset.library_type} </div> : ''
            }
        },
        [ReadsetColumnID.INDEX]: {
            columnID: ReadsetColumnID.INDEX,
            title: "Index",
            dataIndex: ['readset', 'index'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && readset.metrics && readset.index ? <div> {readset.index} </div> : ''
            }
        },
        [ReadsetColumnID.NUMBER_READS]: {
            columnID: ReadsetColumnID.NUMBER_READS,
            title: "Number of Reads",
            dataIndex: ['readset', 'number_reads'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && readset.metrics && readset.metrics['nb_reads'] ? <div> {Number(readset.metrics['nb_reads'].value_numeric)} </div> : ''
            }
        },
    }), [renderReleaseStatus])
}

export enum ReadsetFilterID {
    ID = ReadsetColumnID.ID,
    SAMPLE_NAME = ReadsetColumnID.SAMPLE_NAME,
    RELEASE_STATUS = ReadsetColumnID.RELEASE_STATUS,
    LIBRARY_TYPE = ReadsetColumnID.LIBRARY_TYPE,
    INDEX = ReadsetColumnID.INDEX,
    NUMBER_READS = ReadsetColumnID.NUMBER_READS,
}

export const READSET_COLUMN_FILTERS: { [key in ReadsetFilterID]: FilterDescription } = {
    [ReadsetFilterID.ID]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "Readset ID",
    },
    [ReadsetFilterID.SAMPLE_NAME]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Sample Name",
    },
    [ReadsetFilterID.RELEASE_STATUS]: {
        type: FILTER_TYPE.SELECT,
        placeholder: 'All',
        options: [{ label: 'Available', value: '0' }, { label: 'Released', value: '1' }, { label: 'Blocked', value: '2' }],
        key: UNDEFINED_FILTER_KEY,
        label: "Release Status",
    },
    [ReadsetFilterID.LIBRARY_TYPE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Library Type",
    },
    [ReadsetFilterID.INDEX]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "Index",
    },
    [ReadsetFilterID.NUMBER_READS]: {
        type: FILTER_TYPE.RANGE,
        key: UNDEFINED_FILTER_KEY,
        label: "Number of Reads",
    },
}

export const READSET_FILTER_KEYS: { [key in ReadsetFilterID]: string } = {
    [ReadsetFilterID.ID]: 'id',
    [ReadsetFilterID.SAMPLE_NAME]: 'sample_name',
    [ReadsetFilterID.RELEASE_STATUS]: 'release_status',
    [ReadsetFilterID.LIBRARY_TYPE]: 'derived_sample__library__library_type__name',
    [ReadsetFilterID.INDEX]: 'derived_sample__library__index__name',
    [ReadsetFilterID.NUMBER_READS]: 'number_reads',
}