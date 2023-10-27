import { useAppSelector } from "../../hooks"
import { selectInstrumentTypesByID, selectInstrumentsByID, selectInstrumentsTable } from "../../selectors"
import InstrumentTableActions from '../../modules/instrumentsTable/actions'
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import { INSTRUMENT_FILTER_DEFINITIONS, INSTRUMENT_FILTER_KEYS, ObjectWithInstrument, getColumnsForInstruments } from "./InstrumentTableColumns"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import AppPageHeader from "../AppPageHeader"
import React from "react"
import PageContent from "../PageContent"
import FiltersBar from "../filters/filtersBar/FiltersBar"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable"


function InstrumentListContent() {
    const instrumentTypesById = useAppSelector(selectInstrumentTypesByID)
    const pagedItems = useAppSelector(selectInstrumentsTable)
    const { filters } = pagedItems
    const tableColumns = getColumnsForInstruments(instrumentTypesById);
    const callbacks = usePagedItemsActionsCallbacks(InstrumentTableActions)

    const columns = useFilteredColumns(
        tableColumns,
        INSTRUMENT_FILTER_DEFINITIONS,
        INSTRUMENT_FILTER_KEYS,
        filters,
        callbacks.setFilterCallback,
        callbacks.setFilterOptionsCallback)

    const getDataObjectsByID = useItemsByIDToDataObjects(selectInstrumentsByID, instrument => { return { instrument } })
    return (
        <>
            <AppPageHeader title="Instruments"/>
            <PageContent>
                <FiltersBar filters={filters} clearFilters={callbacks.clearFiltersCallback} />
                <PagedItemsTable<ObjectWithInstrument>
                    columns={columns}
                    getDataObjectsByID={getDataObjectsByID}
                    pagedItems={pagedItems}
                    usingFilters={false}
                    {...callbacks}
                />
            </PageContent>
        </>
    )
}
export default InstrumentListContent