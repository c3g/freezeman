import React from "react"
import { Link } from "react-router-dom"
import { Taxon } from "../../models/frontend_models"
import { IdentifiedTableColumnType } from "../pagedItemsTable/PagedItemsColumns"
import { FilterDescription } from "../../models/paged_items"
import { FILTER_TYPE } from "../../constants"

enum TaxonColumnID {
    ID = 'ID',
    NCBI_ID = 'NCBI_ID',
    NAME = 'NAME',
}
export type TaxonColumn = IdentifiedTableColumnType<Taxon>

export function getColumnsForTaxon(hasWritePermission: boolean): TaxonColumn[] {
    const columnDefinitions = TAXON_COLUMN_DEFINITIONS(hasWritePermission)
    return [
        columnDefinitions.ID,
        columnDefinitions.NCBI_ID,
        columnDefinitions.NAME
    ]
}

export const TAXON_COLUMN_DEFINITIONS = (hasWritePermission: boolean): { [key in TaxonColumnID]: TaxonColumn } => ({
    [TaxonColumnID.ID]: {
        columnID: TaxonColumnID.ID,
        title: 'ID',
        dataIndex: ['taxon', 'id'],
        sorter: (a, b) => a.id - b.id,
        width: '20%',
        render: (_, { id }) =>
            id && hasWritePermission ? (
                <Link to={`/taxons/update/${id}`}>
                    <div>{id}</div>
                </Link>
            ) :
                (<div>
                    {id}
                </div>),
    },
    [TaxonColumnID.NCBI_ID]: {
        columnID: TaxonColumnID.NCBI_ID,
        title: 'NCBI ID',
        dataIndex: ['taxon', 'ncbi_id'],
        sorter: (a, b) => a.ncbi_id - b.ncbi_id,
        width: '20%',
        render: (_, { ncbi_id, id }) =>
            ncbi_id && id && hasWritePermission ? (
                <Link to={`/taxons/update/${id}`}>
                    <div>{ncbi_id}</div>
                </Link>
            ) :
                (<div>
                    {ncbi_id}
                </div>),
    },
    [TaxonColumnID.NAME]: {
        columnID: TaxonColumnID.NAME,
        title: 'Name',
        dataIndex: ['taxon', 'name'],
        sorter: (a, b) => a.name.localeCompare(b.name),
        width: '60%',
        render: (_, { name }) =>
            name && (
                <i>{name}</i>
            ),
    }
})

export const TAXON_FILTERS: { [key in TaxonColumnID]: FilterDescription } = {
    [TaxonColumnID.ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: 'id',
		label: 'ID',
    },
    [TaxonColumnID.NCBI_ID]: {
		type: FILTER_TYPE.INPUT_OBJECT_ID,
		key: 'ncbi_id',
		label: 'NCBI ID',
    },
    [TaxonColumnID.NAME]: {
		type: FILTER_TYPE.INPUT,
		key: 'name',
		label: 'Name',
    }
}

export const TAXON_FILTER_KEYS: { [key in TaxonColumnID]: string } = {
    [TaxonColumnID.ID]: 'id',
    [TaxonColumnID.NCBI_ID]: 'ncbi_id',
    [TaxonColumnID.NAME]: 'name'
}
