import React from "react"
import { Taxon } from "../../../models/frontend_models"
import { IdentifiedTableColumnType } from "../WorkflowSamplesTable/SampleTableColumns"

export interface ObjectWithDefinition {
    definition: Taxon | any
}
export enum TaxonColumnID {
    ID = 'ID',
    NCBI_ID = 'NCBI_ID',
    NAME = 'NAME',
}
export type DefinitionColumn = IdentifiedTableColumnType<ObjectWithDefinition>

export const TAXON_COLUMN_DEFINITIONS: { [key in TaxonColumnID]: DefinitionColumn } = {

    [TaxonColumnID.ID]: {
        columnID: TaxonColumnID.ID,
        title: 'ID',
        dataIndex: ['taxon', 'id'],
        render: (_, { definition }) =>
            definition && (
                <div>{definition.id}</div>
            ),
    },
    [TaxonColumnID.NCBI_ID]: {
        columnID: TaxonColumnID.NCBI_ID,
        title: 'NCBI_ID',
        dataIndex: ['taxon', 'ncbi_id'],
        render: (_, { definition }) =>
            definition && (
                <div>{definition.ncbi_id}</div>
            ),
    },
    [TaxonColumnID.NAME]: {
        columnID: TaxonColumnID.NAME,
        title: 'NAME',
        dataIndex: ['taxon', 'name'],
        render: (_, { definition }) =>
            definition && (
                <div>{definition.name}</div>
            ),
    },
    
}