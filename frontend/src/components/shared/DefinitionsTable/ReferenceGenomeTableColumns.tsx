import { Link } from "react-router-dom";
import { ReferenceGenome } from "../../../models/frontend_models";
import { IdentifiedTableColumnType } from "../WorkflowSamplesTable/SampleTableColumns";
import React from "react";

export interface ObjectWithReferenceGenome {
    referenceGenome: Required<Pick<ReferenceGenome, "id" | "assembly_name" | "synonym" | "genbank_id" | "refseq_id" | "taxon_id" | "size">>
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

export const getColumnsForReferenceGenome = (taxonsByID): IdentifiedTableColumnType<ObjectWithReferenceGenome>[] => {
    const REFERENCE_GENOME_COLUMN_DEFINITIONS = REFERENCE_GENOME_COLUMNS(taxonsByID)
    return REFERENCE_GENOME_COLUMN_DEFINITIONS.map((column: ReferenceGenomeColumn) => { return { ...column } });
}


const REFERENCE_GENOME_COLUMNS = (taxonsByID): ReferenceGenomeColumn[] => [
    {
        columnID: ReferenceGenomeID.ID,
        title: 'ID',
        dataIndex: ['referenceGenome', 'id'],
        sorter: (a, b) => a.referenceGenome.id - b.referenceGenome.id,
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <Link to={`/genomes/update/${referenceGenome.id}`}>
                    <div>{referenceGenome.id}</div>
                </Link>
            ),
    },
    {
        columnID: ReferenceGenomeID.ASSEMBLY_NAME,
        title: 'ASSEMBLY_NAME',
        dataIndex: ['referenceGenome', 'assembly_name'],
        sorter: (a, b) => a.referenceGenome.assembly_name.localeCompare(b.referenceGenome.assembly_name),
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <Link to={`/genomes/update/${referenceGenome.id}`}>
                    <div>{referenceGenome.assembly_name}</div>
                </Link>
            ),
    },
    {
        columnID: ReferenceGenomeID.SYNONYM,
        title: 'SYNONYM',
        dataIndex: ['referenceGenome', 'synonym'],
        sorter: (a, b) => a.referenceGenome.synonym.localeCompare(b.referenceGenome.synonym),
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <div>{referenceGenome.synonym}</div>
            ),
    },
    {
        columnID: ReferenceGenomeID.GENBANK_ID,
        title: 'GENBANK_ID',
        dataIndex: ['referenceGenome', 'genbank_id'],
        sorter: (a, b) => a.referenceGenome.genbank_id.localeCompare(b.referenceGenome.genbank_id),
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <div>{referenceGenome.genbank_id}</div>
            ),
    },
    {
        columnID: ReferenceGenomeID.REFSEQ_ID,
        title: 'REFSEQ_ID',
        dataIndex: ['referenceGenome', 'refseq_id'],
        sorter: (a, b) => a.referenceGenome.refseq_id.localeCompare(b.referenceGenome.refseq_id),
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <div>{referenceGenome.refseq_id}</div>
            ),
    },
    {
        columnID: ReferenceGenomeID.TAXON_ID,
        title: 'TAXON',
        dataIndex: ['referenceGenome', 'taxon_id'],
        sorter: (a, b) => a.referenceGenome.taxon_id - b.referenceGenome.taxon_id,
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <Link to={`/taxons/update/${referenceGenome.taxon_id}`}>
                    <div>{taxonsByID[referenceGenome.taxon_id].name}</div>
                </Link>
            ),
    },
    {
        columnID: ReferenceGenomeID.SIZE,
        title: 'SIZE',
        dataIndex: ['referenceGenome', 'size'],
        sorter: (a, b) => a.referenceGenome.size - b.referenceGenome.size,
        render: (_, { referenceGenome }) =>
            referenceGenome && (
                <div>{referenceGenome.size}</div>

            ),
    }
]