import React from "react"
import { IdentifiedTableColumnType } from "../shared/WorkflowSamplesTable/SampleTableColumns"
import { Link } from "react-router-dom"
import { Taxon } from "../../models/frontend_models"

enum TaxonColumnID {
    ID = 'ID',
    NCBI_ID = 'NCBI_ID',
    NAME = 'NAME',
}
type TaxonColumn = IdentifiedTableColumnType<Taxon>

export const getColumnsForTaxon = (): TaxonColumn[] => {
    const TAXON_COLUMN_DEFINITIONS = TAXON_COLUMNS;
    return TAXON_COLUMN_DEFINITIONS.map((column: TaxonColumn) => { return { ...column } })
}

const TAXON_COLUMNS: TaxonColumn[] = [
    {
        columnID: TaxonColumnID.ID,
        title: 'ID',
        dataIndex: ['taxon', 'id'],
        sorter: (a, b) => a.id - b.id,
        width: '20%',
        render: (_, { id }) =>
            id && (
                <Link to={`/taxons/update/${id}`}>
                    <div>{id}</div>
                </Link>
            ),
    },
    {
        columnID: TaxonColumnID.NCBI_ID,
        title: 'NCBI ID',
        dataIndex: ['taxon', 'ncbi_id'],
        sorter: (a, b) => a.ncbi_id - b.ncbi_id,
        width: '20%',
        render: (_, { ncbi_id, id }) =>
            ncbi_id && id && (
                <Link to={`/taxons/update/${id}`}>
                    <div>{ncbi_id}</div>
                </Link>
            ),
    },
    {
        columnID: TaxonColumnID.NAME,
        title: 'Name',
        dataIndex: ['taxon', 'name'],
        sorter: (a, b) => a.name.localeCompare(b.name),
        width: '60%',
        render: (_, { name }) =>
            name && (
                <div>{name}</div>
            ),
    }
]

