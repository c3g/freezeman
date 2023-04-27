import React from "react"
import { IdentifiedTableColumnType } from "../WorkflowSamplesTable/SampleTableColumns"

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
        render: (_, { taxon }) =>
            taxon && (
                <div>{taxon.id}</div>
            ),
    },
    [TaxonColumnID.NCBI_ID]: {
        columnID: TaxonColumnID.NCBI_ID,
        title: 'NCBI_ID',
        dataIndex: ['taxon', 'ncbi_id'],
        render: (_, { taxon }) =>
            taxon && (
                <div>{taxon.ncbi_id}</div>
            ),
    },
    [TaxonColumnID.NAME]: {
        columnID: TaxonColumnID.NAME,
        title: 'NAME',
        dataIndex: ['taxon', 'name'],
        render: (_, { taxon }) =>
            taxon && (
                <div>{taxon.name}</div>
            ),
    },

}