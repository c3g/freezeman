import React, { useMemo, useCallback } from "react"
import { SAMPLE_COLUMN_DEFINITIONS as SAMPLE_COLUMNS, SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_FILTER_KEYS } from '../shared/WorkflowSamplesTable/SampleTableColumns';
import WorkflowSamplesTable from "../shared/WorkflowSamplesTable/WorkflowSamplesTable"
import { clearFilters, setIndividualDetailsSamplesFilter } from '../../modules/individualDetails/actions'
import { FilterDescription, FilterValue } from "../../models/paged_items";
import { useAppDispatch } from "../../hooks";
import { Individual } from "../../modules/individualDetails/reducers";
import { SampleAndLibrary } from "../shared/WorkflowSamplesTable/ColumnSets";
interface IndividualAssociatedSamplesProps {
    samples: SampleAndLibrary[],
    individual: Individual
}

const IndividualAssociatedSamples = ({ samples, individual }: IndividualAssociatedSamplesProps) => {

    const dispatch = useAppDispatch();

    const handleSetFilter = useCallback(
        (filterKey: string, value: FilterValue, description: FilterDescription) => {
            if (typeof description === 'undefined') {
                return
            }
            dispatch(setIndividualDetailsSamplesFilter(individual.individual.id, description, value))
        }, []
    )
    const columnsForSelection = useMemo(() => {
        const columns = [
            SAMPLE_COLUMNS.ID,
            SAMPLE_COLUMNS.KIND,
            SAMPLE_COLUMNS.NAME,
            SAMPLE_COLUMNS.PROJECT,
            SAMPLE_COLUMNS.CONTAINER_BARCODE,
            SAMPLE_COLUMNS.COORDINATES,
            SAMPLE_COLUMNS.VOLUME,
            SAMPLE_COLUMNS.CONCENTRATION,
            SAMPLE_COLUMNS.QC_FLAG,
            SAMPLE_COLUMNS.CREATION_DATE,
            SAMPLE_COLUMNS.DEPLETED
        ]
        return columns
    }, [samples])

    const filterKeys = useMemo(() => {
        return { ...SAMPLE_NEXT_STEP_FILTER_KEYS }
    }, [])

    const filterDefinitions = useMemo(() => {
        return { ...SAMPLE_COLUMN_FILTERS }
    }, [])

    const localClearFilters = () => {
        if (clearFilters)
            dispatch(clearFilters(individual.individual.id))
    }

    return <>
        <WorkflowSamplesTable
            clearFilters={localClearFilters}
            hasFilter={true}
            filters={individual.samplesByIndividual.filters}
            filterDefinitions={filterDefinitions}
            filterKeys={filterKeys}
            samples={samples ? samples : []}
            setFilter={handleSetFilter}
            columns={columnsForSelection}
            setSortBy={() => { }}
        />
    </>
}

export default IndividualAssociatedSamples