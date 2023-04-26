import { IdentifiedTableColumnType } from "../WorkflowSamplesTable/SampleTableColumns";
import { DefinitionColumn, ObjectWithDefinition, TAXON_COLUMN_DEFINITIONS as TAXON_COLUMNS } from "./DefinitionTableColumns"

export function getColumnsForDefinition(definition: string): IdentifiedTableColumnType<ObjectWithDefinition>[] {
    const DEFAULT_DEFINITIONS = []
    const TAXON_COLUMN_DEFINITIONS = [
        TAXON_COLUMNS.ID,
        TAXON_COLUMNS.NCBI_ID,
        TAXON_COLUMNS.NAME,
    ]

    let columns: DefinitionColumn[] = DEFAULT_DEFINITIONS;

    switch (definition) {
        case 'Taxon':
            columns = TAXON_COLUMN_DEFINITIONS;
            break;
        default:
            break;
    }

    return columns.map((column: any) => { return { ...column } })
}