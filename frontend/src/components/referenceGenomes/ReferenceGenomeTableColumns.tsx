import { Link } from "react-router-dom";
import { IdentifiedTableColumnType } from "../shared/WorkflowSamplesTable/SampleTableColumns";
import React from "react";
import { ReferenceGenome } from "../../models/frontend_models";
import { WithContainerRenderComponent } from "../shared/WithItemRenderComponent";

enum ReferenceGenomeID {
    ID = 'ID',
    ASSEMBLY_NAME = 'ASSEMBLY_NAME',
    SYNONYM = 'SYNONYM',
    GENBANK_ID = 'GENBANK_ID',
    REFSEQ_ID = 'REFSEQ_ID',
    TAXON_ID = 'TAXON_ID',
    SIZE = 'SIZE'
}

type ReferenceGenomeColumn = IdentifiedTableColumnType<ReferenceGenome>

export const getColumnsForReferenceGenome = (taxonsByID): ReferenceGenomeColumn[] => {
    const REFERENCE_GENOME_COLUMN_DEFINITIONS = REFERENCE_GENOME_COLUMNS(taxonsByID)
    return REFERENCE_GENOME_COLUMN_DEFINITIONS.map((column: ReferenceGenomeColumn) => { return { ...column } });
}


const REFERENCE_GENOME_COLUMNS = (taxonsByID): ReferenceGenomeColumn[] => [
    {
        columnID: ReferenceGenomeID.ID,
        title: 'ID',
        dataIndex: ['referenceGenome', 'id'],
        sorter: (a, b) => a.id - b.id,
        render: (_, { id }) =>
            id && (
                <Link to={`/genomes/update/${id}`}>
                    <div>{id}</div>
                </Link>
            ),
    },
    {
        columnID: ReferenceGenomeID.ASSEMBLY_NAME,
        title: 'Assembly Name',
        dataIndex: ['referenceGenome', 'assembly_name'],
        sorter: (a, b) => a.assembly_name.localeCompare(b.assembly_name),
        render: (_, { id, assembly_name }) =>
            assembly_name && id && (
                <Link to={`/genomes/update/${id}`}>
                    <div>{assembly_name}</div>
                </Link>
            ),
    },
    {
        columnID: ReferenceGenomeID.SYNONYM,
        title: 'Synonym',
        dataIndex: ['referenceGenome', 'synonym'],
        sorter: (a, b) => {
            if (a && b && a.synonym && b.synonym) {

                return a.synonym.localeCompare(b.synonym);
            }
            return 0;
        },
        render: (_, { synonym }) =>
            synonym && (
                <div>{synonym}</div>
            ),
    },
    {
        columnID: ReferenceGenomeID.GENBANK_ID,
        title: 'Genbank ID',
        dataIndex: ['referenceGenome', 'genbank_id'],
        sorter: (a, b) => {
            if (a && b && a.genbank_id && b.genbank_id) {

                return a.genbank_id.localeCompare(b.genbank_id);
            }
            return 0;
        },
        render: (_, { genbank_id }) =>
            genbank_id && (
                <div>{genbank_id}</div>
            ),
    },
    {
        columnID: ReferenceGenomeID.REFSEQ_ID,
        title: 'Refseq ID',
        dataIndex: ['referenceGenome', 'refseq_id'],
        sorter: (a, b) => {
            if (a && b && a.refseq_id && b.refseq_id) {

                return a.refseq_id.localeCompare(b.refseq_id);
            }
            return 0;
        },
        render: (_, { refseq_id }) =>
            refseq_id && (
                <div>{refseq_id}</div>
            ),
    },
    {
        columnID: ReferenceGenomeID.TAXON_ID,
        title: 'Taxon',
        dataIndex: ['referenceGenome', 'taxon_id'],
        sorter: (a, b) => a.taxon_id - b.taxon_id,
        render: (_, { taxon_id }) =>
            taxon_id && (
                <WithContainerRenderComponent
                    objectID={taxon_id}
                    placeholder={<span>loading...</span>}
                    render={() => <span>{taxonsByID[taxon_id].name}</span>}
                />
            ),
    },
    {
        columnID: ReferenceGenomeID.SIZE,
        title: 'Size',
        dataIndex: ['referenceGenome', 'size'],
        sorter: (a, b) => a.size - b.size,
        render: (_, { size }) =>
            size && (
                <div>{size}</div>

            ),
    }
]