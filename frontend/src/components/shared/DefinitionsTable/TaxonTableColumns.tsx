import React from "react"
import { IdentifiedTableColumnType } from "../WorkflowSamplesTable/SampleTableColumns"
import { Link } from "react-router-dom"

export interface Taxon {
    id: number,
    name: string,
    ncbi_id: number,

}
export interface ObjectWithTaxon {
    taxon: Taxon
}
export enum TaxonColumnID {
    ID = 'ID',
    NCBI_ID = 'NCBI_ID',
    NAME = 'NAME',
}
export type TaxonColumn = IdentifiedTableColumnType<ObjectWithTaxon>

export const getColumnsForTaxon = (): IdentifiedTableColumnType<ObjectWithTaxon>[] => {
    const TAXON_COLUMN_DEFINITIONS = [
        TAXON_COLUMNS.ID,
        TAXON_COLUMNS.NCBI_ID,
        TAXON_COLUMNS.NAME,
    ]
    return TAXON_COLUMN_DEFINITIONS.map((column: any) => { return { ...column } })
}

export const TAXON_COLUMNS: { [key in TaxonColumnID]: TaxonColumn } = {

    [TaxonColumnID.ID]: {
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
    [TaxonColumnID.NCBI_ID]: {
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
    [TaxonColumnID.NAME]: {
        columnID: TaxonColumnID.NAME,
        title: 'NAME',
        dataIndex: ['taxon', 'name'],
        sorter: (a, b) => a.taxon.name.localeCompare(b.taxon.name),
        width: '33%',
        render: (_, { taxon }) =>
            taxon && (
                <div>{taxon.name}</div>
            ),
    },

}