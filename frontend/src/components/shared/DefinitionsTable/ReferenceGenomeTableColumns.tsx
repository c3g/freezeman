import { Link } from "react-router-dom";
import { ReferenceGenome } from "../../../models/frontend_models";
import { IdentifiedTableColumnType } from "../WorkflowSamplesTable/SampleTableColumns";
import React from "react";

export interface ObjectWithReferenceGenome {
    referenceGenome: Pick<ReferenceGenome, "id" | "assembly_name" | "synonym" | "genbank_id" | "refseq_id" | "taxon_id" | "size">
}

enum ReferenceGenomeID {
    ID = 'ID',
    ASSEMBLY_NAME = 'ASSEMBLY_NAME',
    SYNONYM = 'SYNONYM',
    GENBANK_ID = 'GENBANK_ID',
    REFSEQ_ID = 'REFSEQ_ID',
    TAXON_ID = 'TAXON_ID',
    SIZE = 'SIZE'
}

type ReferenceGenomeColumn = IdentifiedTableColumnType<ObjectWithReferenceGenome>

export const getColumnsForReferenceGenome = (): IdentifiedTableColumnType<ObjectWithReferenceGenome>[] => {
    const REFERENCE_GENOME_DEFINITIONS = [
        REFERENCE_GENOME_COLUMNS.ID,
        REFERENCE_GENOME_COLUMNS.ASSEMBLY_NAME,
        REFERENCE_GENOME_COLUMNS.SYNONYM,
        REFERENCE_GENOME_COLUMNS.TAXON_ID,
        REFERENCE_GENOME_COLUMNS.SIZE,
        REFERENCE_GENOME_COLUMNS.GENBANK_ID,
        REFERENCE_GENOME_COLUMNS.REFSEQ_ID,

    ]
    return REFERENCE_GENOME_DEFINITIONS.map((column: any) => { return { ...column } });
}

const REFERENCE_GENOME_COLUMNS: { [key in ReferenceGenomeID]: ReferenceGenomeColumn } = {
    [ReferenceGenomeID.ID]: {
        columnID: ReferenceGenomeID.ID,
        title: 'ID',
        dataIndex: ['referenceGenome', 'id'],
        sorter: (a, b) => a.referenceGenome.id - b.referenceGenome.id,
        // width: '33%',
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <Link to={`/referenceGenome/update/${referenceGenome.id}`}>
                    <div>{referenceGenome.id}</div>
                </Link>
            ),
    },
    [ReferenceGenomeID.ASSEMBLY_NAME]: {
        columnID: ReferenceGenomeID.ASSEMBLY_NAME,
        title: 'ASSEMBLY_NAME',
        dataIndex: ['referenceGenome', 'assembly_name'],
        // sorter: (a, b) => a.referenceGenome.id - b.referenceGenome.id,
        // width: '33%',
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <Link to={`/referenceGenome/update/${referenceGenome.assembly_name}`}>
                    <div>{referenceGenome.assembly_name}</div>
                </Link>
            ),
    },
    [ReferenceGenomeID.SYNONYM]: {
        columnID: ReferenceGenomeID.SYNONYM,
        title: 'SYNONYM',
        dataIndex: ['referenceGenome', 'synonym'],
        // sorter: (a, b) => a.referenceGenome.id - b.referenceGenome.id,
        // width: '33%',
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <div>{referenceGenome.synonym}</div>
            ),
    },
    [ReferenceGenomeID.GENBANK_ID]: {
        columnID: ReferenceGenomeID.GENBANK_ID,
        title: 'GENBANK_ID',
        dataIndex: ['referenceGenome', 'genbank_id'],
        // sorter: (a, b) => a.referenceGenome.id - b.referenceGenome.id,
        // width: '33%',
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <div>{referenceGenome.genbank_id}</div>
            ),
    },
    [ReferenceGenomeID.REFSEQ_ID]: {
        columnID: ReferenceGenomeID.REFSEQ_ID,
        title: 'REFSEQ_ID',
        dataIndex: ['referenceGenome', 'refseq_id'],
        // sorter: (a, b) => a.referenceGenome.id - b.referenceGenome.id,
        // width: '33%',
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <div>{referenceGenome.refseq_id}</div>
            ),
    },
    [ReferenceGenomeID.TAXON_ID]: {
        columnID: ReferenceGenomeID.TAXON_ID,
        title: 'TAXON',
        dataIndex: ['referenceGenome', 'taxon_id'],
        // sorter: (a, b) => a.referenceGenome.id - b.referenceGenome.id,
        // width: '33%',
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <Link to={`/taxons/update/${referenceGenome.taxon_id}`}>
                    <div>{referenceGenome.taxon_id}</div>
                </Link>
            ),
    },
    [ReferenceGenomeID.SIZE]: {
        columnID: ReferenceGenomeID.SIZE,
        title: 'SIZE',
        dataIndex: ['referenceGenome', 'size'],
        // sorter: (a, b) => a.referenceGenome.id - b.referenceGenome.id,
        // width: '33%',
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <div>{referenceGenome.size}</div>

            ),
    }
}