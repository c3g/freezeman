import React from "react"
import { IdentifiedTableColumnType } from "../WorkflowSamplesTable/SampleTableColumns"
import { Link } from "react-router-dom"
import { Taxon } from "../../../models/frontend_models"


export interface ObjectWithTaxon {
    taxon: Pick<Taxon, 'id' | 'name' | 'ncbi_id'>
}
enum TaxonColumnID {
    ID = 'ID',
    NCBI_ID = 'NCBI_ID',
    NAME = 'NAME',
}
type TaxonColumn = IdentifiedTableColumnType<ObjectWithTaxon>

export const getColumnsForTaxon = (): IdentifiedTableColumnType<ObjectWithTaxon>[] => {
    const TAXON_COLUMN_DEFINITIONS = TAXON_COLUMNS();
    return TAXON_COLUMN_DEFINITIONS.map((column: TaxonColumn) => { return { ...column } })
}

const TAXON_COLUMNS = (): TaxonColumn[] => [
    {
        columnID: TaxonColumnID.ID,
        title: 'ID',
        dataIndex: ['taxon', 'id'],
        sorter: (a, b) => a.taxon.id - b.taxon.id,
        width: '33%',
        render: (_, { taxon }) =>
            taxon && (
                <Link to={`/taxons/update/${taxon.id}`}>
                    <div>{taxon.id}</div>
                </Link>
            ),
    },
    {
        columnID: TaxonColumnID.NCBI_ID,
        title: 'NCBI_ID',
        dataIndex: ['taxon', 'ncbi_id'],
        sorter: (a, b) => a.taxon.ncbi_id - b.taxon.ncbi_id,
        width: '33%',
        render: (_, { taxon }) =>
            taxon && (
                <Link to={`/taxons/update/${taxon.id}`}>
                    <div>{taxon.ncbi_id}</div>
                </Link>
            ),
    },
    {
        columnID: TaxonColumnID.NAME,
        title: 'NAME',
        dataIndex: ['taxon', 'name'],
        sorter: (a, b) => a.taxon.name.localeCompare(b.taxon.name),
        width: '33%',
        render: (_, { taxon }) =>
            taxon && (
                <div>{taxon.name}</div>
            ),
    }
]

