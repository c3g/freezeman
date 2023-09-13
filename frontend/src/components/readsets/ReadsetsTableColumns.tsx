import React from "react";
import { Readset } from "../../models/frontend_models";
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns";
import { FilterDescription } from "../../models/paged_items";
import { UNDEFINED_FILTER_KEY } from "../pagedItemsTable/PagedItemsFilters";
import { FILTER_TYPE } from "../../constants";
import { Link } from "react-router-dom";
import { Button } from "antd";

export interface ObjectWithReadset {
    readset: Readset
}
const RELEASED = 1
const BLOCKED = 2
const RELEASE_STATUS_STRING = ["Available", "Released", "Blocked"]
const OPPOSITE_STATUS = [RELEASED, BLOCKED, RELEASED]
export type ReadsetColumn = IdentifiedTableColumnType<ObjectWithReadset>

export enum ReadsetColumnID {
    ID = 'ID',
    SAMPLE_NAME = 'SAMPLE_NAME',
    RELEASE_STATUS = 'RELEASE_STATUS',
    LIBRARY_TYPE = 'LIBRARY_TYPE',
    INDEX = 'INDEX',
    NUM_READS = 'NUM_READS',
    NUM_BASES = 'NUM_BASES',
    MEAN_QUALITY_SCORE = 'MEAN_QUALITY_SCORE',
    BLAST_HIT = 'BLAST_HIT'
}

export const READSET_COLUMN_DEFINITIONS = (toggleReleaseStatus, releaseStatusOption): { [key in ReadsetColumnID]: ReadsetColumn } => {
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
            title: "SAMPLE_NAME",
            dataIndex: ['readset', 'sample_name'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && <div> {readset.sample_name} </div>
            }
        },
        [ReadsetColumnID.RELEASE_STATUS]: {
            columnID: ReadsetColumnID.RELEASE_STATUS,
            title: "RELEASE_STATUS",
            dataIndex: ['readset', 'release_status'],
            sorter: true,
            render: (_, { readset }) => {
                const id = 0
                // const releaseStatus = releaseStatusOption.specific[id] ?? releaseStatusOption.all ?? readset.release_status
                // const changed = (releaseStatusOption.all && releaseStatusOption.all !== readset.release_status && !releaseStatusOption.specific[id]) || (!releaseStatusOption.all && releaseStatusOption.specific[id])
                return readset && <Button
                    // disabled={!canReleaseOrBlockFiles}
                    // style={{ color: changed ? "red" : "grey", width: "6em" }}
                    onClick={() => toggleReleaseStatus(OPPOSITE_STATUS[readset.release_status])}>{RELEASE_STATUS_STRING[readset.release_status]}
                </Button>
            }
        },
        [ReadsetColumnID.LIBRARY_TYPE]: {
            columnID: ReadsetColumnID.LIBRARY_TYPE,
            title: "LIBRARY_TYPE",
            dataIndex: ['readset', 'library_type'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && <div> {readset.library_type} </div>
            }
        },
        [ReadsetColumnID.INDEX]: {
            columnID: ReadsetColumnID.INDEX,
            title: "INDEX",
            dataIndex: ['readset', 'index'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && <div> {readset.index} </div>
            }
        },
        [ReadsetColumnID.NUM_READS]: {
            columnID: ReadsetColumnID.NUM_READS,
            title: "NUM_READS",
            dataIndex: ['readset', 'number_reads'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && <div> {readset.number_reads} </div>
            }
        },
        [ReadsetColumnID.NUM_BASES]: {
            columnID: ReadsetColumnID.NUM_BASES,
            title: "NUM_BASES",
            dataIndex: ['readset', 'number_bases'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && <div> {readset.number_bases} </div>
            }
        },
        [ReadsetColumnID.MEAN_QUALITY_SCORE]: {
            columnID: ReadsetColumnID.MEAN_QUALITY_SCORE,
            title: "MEAN_QUALITY_SCORE",
            dataIndex: ['readset', 'mean_quality_score'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && <div> {readset.mean_quality_score} </div>
            }
        },
        [ReadsetColumnID.BLAST_HIT]: {
            columnID: ReadsetColumnID.BLAST_HIT,
            title: "BLAST_HIT",
            dataIndex: ['readset', 'blast_hit'],
            sorter: true,
            render: (_, { readset }) => {
                return readset && <div> {readset.blast_hit} </div>
            }
        },
    }
}

export enum ReadsetFilterID {
    ID = ReadsetColumnID.ID,
    SAMPLE_NAME = ReadsetColumnID.SAMPLE_NAME,
    RELEASE_STATUS = ReadsetColumnID.RELEASE_STATUS,
    LIBRARY_TYPE = ReadsetColumnID.LIBRARY_TYPE,
    INDEX = ReadsetColumnID.INDEX,
    NUM_READS = ReadsetColumnID.NUM_READS,
    NUM_BASES = ReadsetColumnID.NUM_BASES,
    MEAN_QUALITY_SCORE = ReadsetColumnID.MEAN_QUALITY_SCORE,
    BLAST_HIT = ReadsetColumnID.BLAST_HIT,
}

export const READSET_COLUMN_FILTERS: { [key in ReadsetColumnID]: FilterDescription } = {
    [ReadsetColumnID.ID]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "id",
    },
    [ReadsetColumnID.SAMPLE_NAME]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "sample_name",
    },
    [ReadsetColumnID.RELEASE_STATUS]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "release_status",
    },
    [ReadsetColumnID.LIBRARY_TYPE]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "library_type",
    },
    [ReadsetColumnID.INDEX]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "index",
    },
    [ReadsetColumnID.NUM_READS]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "number_reads",
    },
    [ReadsetColumnID.NUM_BASES]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "number_bases",
    },
    [ReadsetColumnID.MEAN_QUALITY_SCORE]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "mean_qualirt_score",
    },
    [ReadsetColumnID.BLAST_HIT]: {
        type: FILTER_TYPE.INPUT_OBJECT_ID,
        key: UNDEFINED_FILTER_KEY,
        label: "blast_hit",
    }
}

export const READSET_FILTER_KEYS: { [key in ReadsetColumnID]: string } = {
    [ReadsetColumnID.ID]: 'id',
    [ReadsetColumnID.SAMPLE_NAME]: 'sample_name',
    [ReadsetColumnID.RELEASE_STATUS]: 'release_status',
    [ReadsetColumnID.LIBRARY_TYPE]: 'library_type',
    [ReadsetColumnID.INDEX]: 'index',
    [ReadsetColumnID.NUM_READS]: 'number_reads',
    [ReadsetColumnID.NUM_BASES]: 'number_bases',
    [ReadsetColumnID.MEAN_QUALITY_SCORE]: 'mean_quality_score',
    [ReadsetColumnID.BLAST_HIT]: 'blast_hit',
}