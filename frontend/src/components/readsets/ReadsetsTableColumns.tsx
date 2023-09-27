import React from "react";
import { Readset } from "../../models/frontend_models";
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns";
import { FilterDescription } from "../../models/paged_items";
import { UNDEFINED_FILTER_KEY } from "../pagedItemsTable/PagedItemsFilters";
import { FILTER_TYPE } from "../../constants";
import { Button } from "antd";

export interface ObjectWithReadset {
    readset: Readset
}
export const RELEASED = 1
export const BLOCKED = 2
export const RELEASE_STATUS_STRING = ["Available", "Released", "Blocked"]
export const OPPOSITE_STATUS = [RELEASED, BLOCKED, RELEASED]
export type ReadsetColumn = IdentifiedTableColumnType<ObjectWithReadset>

export enum ReadsetColumnID {
    ID = 'ID',
    SAMPLE_NAME = 'SAMPLE_NAME',
    RELEASE_STATUS = 'RELEASE_STATUS',
    LIBRARY_TYPE = 'LIBRARY_TYPE',
    INDEX = 'INDEX',
    NUMBER_READS = 'NUMBER_READS',
    // NB_BASES = 'NUM_BASES',
    // MEAN_QUALITY_SCORE = 'MEAN_QUALITY_SCORE',
    // BLAST_HIT = 'BLAST_HIT'
}

export const READSET_COLUMN_DEFINITIONS = (toggleReleaseStatus, releaseStatusOption, canReleaseOrBlockFiles): { [key in ReadsetColumnID]: ReadsetColumn } => {
    return {
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
            render: (_, { readset }) => {
                const { id } = readset;
                const releaseStatus = releaseStatusOption.specific[id] ?? readset.release_status
                const changed = (releaseStatusOption.specific[id])
                return readset && <Button
                    disabled={!canReleaseOrBlockFiles}
                    style={{ color: changed ? "red" : "grey", width: "6em" }}
                    onClick={() => toggleReleaseStatus(id, OPPOSITE_STATUS[releaseStatus])}>{RELEASE_STATUS_STRING[releaseStatus]}
                </Button>
            }
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
        // [ReadsetColumnID.NB_BASES]: {
        //     columnID: ReadsetColumnID.NB_BASES,
        //     title: "Number of bases",
        //     dataIndex: ['readset', 'nb_bases'],
        //     sorter: true,
        //     render: (_, { readset }) => {
        //         return readset && readset.metrics && readset.metrics['nb_bases'] ? <div> {Number(readset.metrics['nb_bases'].value_numeric)} </div> : ''
        //     }
        // },
        // [ReadsetColumnID.MEAN_QUALITY_SCORE]: {
        //     columnID: ReadsetColumnID.MEAN_QUALITY_SCORE,
        //     title: "Mean quality score",
        //     dataIndex: ['readset', 'mean_quality_score'],
        //     sorter: true,
        //     render: (_, { readset }) => {
        //         return readset && readset.metrics && readset.metrics['mean_quality_score'] ? <div> {Number(readset.metrics['mean_quality_score'].value_numeric).toFixed(3)} </div> : ''
        //     }
        // },
        // [ReadsetColumnID.BLAST_HIT]: {
        //     columnID: ReadsetColumnID.BLAST_HIT,
        //     title: "Blast hit",
        //     dataIndex: ['readset', 'blast_hit'],
        //     sorter: true,
        //     render: (_, { readset }) => {
        //         return readset && readset.metrics && readset.metrics['1st_hit'] ? <div> {readset.metrics['1st_hit'].value_string} </div> : ''
        //     }
        // },
    }
}

export enum ReadsetFilterID {
    ID = ReadsetColumnID.ID,
    SAMPLE_NAME = ReadsetColumnID.SAMPLE_NAME,
    RELEASE_STATUS = ReadsetColumnID.RELEASE_STATUS,
    LIBRARY_TYPE = ReadsetColumnID.LIBRARY_TYPE,
    INDEX = ReadsetColumnID.INDEX,
    NUM_READS = ReadsetColumnID.NUMBER_READS,
    // NUM_BASES = ReadsetColumnID.NB_BASES,
    // MEAN_QUALITY_SCORE = ReadsetColumnID.MEAN_QUALITY_SCORE,
    // BLAST_HIT = ReadsetColumnID.BLAST_HIT,
}

export const READSET_COLUMN_FILTERS: { [key in ReadsetColumnID]: FilterDescription } = {
    [ReadsetColumnID.ID]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "id",
    },
    [ReadsetColumnID.SAMPLE_NAME]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "sample_name",
    },
    [ReadsetColumnID.RELEASE_STATUS]: {
        type: FILTER_TYPE.SELECT,
        placeholder: 'All',
        options: [{ label: 'Available', value: '0' }, { label: 'Released', value: '1' }, { label: 'Blocked', value: '2' }],
        key: UNDEFINED_FILTER_KEY,
        label: "release_status",
    },
    [ReadsetColumnID.LIBRARY_TYPE]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "library_type",
    },
    [ReadsetColumnID.INDEX]: {
        type: FILTER_TYPE.INPUT,
        key: UNDEFINED_FILTER_KEY,
        label: "index",
    },
    [ReadsetColumnID.NUMBER_READS]: {
        type: FILTER_TYPE.RANGE,
        key: UNDEFINED_FILTER_KEY,
        label: "NUMBER_READS",
    },
    // [ReadsetColumnID.NB_BASES]: {
    //     type: FILTER_TYPE.RANGE,
    //     key: UNDEFINED_FILTER_KEY,
    //     label: "nb_bases",
    // },
    // [ReadsetColumnID.MEAN_QUALITY_SCORE]: {
    //     type: FILTER_TYPE.RANGE,
    //     key: UNDEFINED_FILTER_KEY,
    //     label: "mean_quality_score",
    // },
    // [ReadsetColumnID.BLAST_HIT]: {
    //     type: FILTER_TYPE.INPUT,
    //     key: UNDEFINED_FILTER_KEY,
    //     label: "blast_hit",
    // }
}

export const READSET_FILTER_KEYS: { [key in ReadsetColumnID]: string } = {
    [ReadsetColumnID.ID]: 'id',
    [ReadsetColumnID.SAMPLE_NAME]: 'sample_name',
    [ReadsetColumnID.RELEASE_STATUS]: 'release_status',
    [ReadsetColumnID.LIBRARY_TYPE]: 'derived_sample__library__library_type__name',
    [ReadsetColumnID.INDEX]: 'derived_sample__library__index__name',
    [ReadsetColumnID.NUMBER_READS]: 'number_reads',
    // [ReadsetColumnID.NB_BASES]: 'nb_bases',
    // [ReadsetColumnID.MEAN_QUALITY_SCORE]: 'mean_quality_score',
    // [ReadsetColumnID.BLAST_HIT]: 'blast_hit',
}