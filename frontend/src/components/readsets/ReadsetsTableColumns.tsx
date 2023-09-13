import React from "react";
import { Readset } from "../../models/frontend_models";
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns";

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
    NUM_READS = 'NUM_READS',
    NUM_BASES = 'NUM_BASES',
    MEAN_QUALITY_SCORE = 'MEAN_QUALITY_SCORE',
    BLAST_HIT = 'BLAST_HIT'
}

export const READSET_COLUMN_DEFINITIONS: { [key in ReadsetColumnID]: ReadsetColumn } = {
    [ReadsetColumnID.ID]: {
        columnID: ReadsetColumnID.ID,
        title: 'ID',
        dataIndex: ['readset', 'id'],
        sorter: true,
        render: (_, { readset }) => {
            return readset && <div />
        }
    },
    [ReadsetColumnID.SAMPLE_NAME]: {
        columnID: ReadsetColumnID.SAMPLE_NAME,
        title: "SAMPLE_NAME",
        dataIndex: ['readset', 'sample_name'],
        sorter: true,
        render: (_, { readset }) => {
            return readset && <div />
        }
    },
    [ReadsetColumnID.RELEASE_STATUS]: {
        columnID: ReadsetColumnID.RELEASE_STATUS,
        title: "RELEASE_STATUS",
        dataIndex: ['readset', 'release_status'],
        sorter: true,
        render: (_, { readset }) => {
            return readset && <div />
        }
    },
    [ReadsetColumnID.LIBRARY_TYPE]: {
        columnID: ReadsetColumnID.LIBRARY_TYPE,
        title: "LIBRARY_TYPE",
        dataIndex: ['readset', 'library_type'],
        sorter: true,
        render: (_, { readset }) => {
            return readset && <div />
        }
    },
    [ReadsetColumnID.INDEX]: {
        columnID: ReadsetColumnID.INDEX,
        title: "INDEX",
        dataIndex: ['readset', 'index'],
        sorter: true,
        render: (_, { readset }) => {
            return readset && <div />
        }
    },
    [ReadsetColumnID.NUM_READS]: {
        columnID: ReadsetColumnID.NUM_READS,
        title: "NUM_READS",
        dataIndex: ['readset', 'number_reads'],
        sorter: true,
        render: (_, { readset }) => {
            return readset && <div />
        }
    },
    [ReadsetColumnID.NUM_BASES]: {
        columnID: ReadsetColumnID.NUM_BASES,
        title: "NUM_BASES",
        dataIndex: ['readset', 'number_bases'],
        sorter: true,
        render: (_, { readset }) => {
            return readset && <div />
        }
    },
    [ReadsetColumnID.MEAN_QUALITY_SCORE]: {
        columnID: ReadsetColumnID.MEAN_QUALITY_SCORE,
        title: "MEAN_QUALITY_SCORE",
        dataIndex: ['readset', 'mean_quality_score'],
        sorter: true,
        render: (_, { readset }) => {
            return readset && <div />
        }
    },
    [ReadsetColumnID.BLAST_HIT]: {
        columnID: ReadsetColumnID.BLAST_HIT,
        title: "BLAST_HIT",
        dataIndex: ['readset', 'blast_hit'],
        sorter: true,
        render: (_, { readset }) => {
            return readset && <div />
        }
    },
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