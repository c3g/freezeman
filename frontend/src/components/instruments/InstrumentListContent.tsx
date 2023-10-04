import { useAppSelector } from "../../hooks"
import { selectInstrumentsByID, selectInstrumentsTable } from "../../selectors"
import InstrumentTableActions from '../../modules/instrumentsTable/actions'
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import { INSTRUMENT_COLUMN_DEFINITIONS, INSTRUMENT_FILTER_DEFINITIONS, INSTRUMENT_FILTER_KEYS, ObjectWithInstrument } from "./InstrumentTableColumns"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import AppPageHeader from "../AppPageHeader"
import React from "react"
import PageContent from "../PageContent"
import FiltersBar from "../filters/filtersBar/FiltersBar"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable"
import AddButton from "../AddButton"

const tableColumns = [
    INSTRUMENT_COLUMN_DEFINITIONS.ID,
    INSTRUMENT_COLUMN_DEFINITIONS.NAME,
    INSTRUMENT_COLUMN_DEFINITIONS.SERIAL_ID,
    INSTRUMENT_COLUMN_DEFINITIONS.TYPE
]

function InstrumentListContent() {

    const pagedItems = useAppSelector(selectInstrumentsTable)
    const { filters } = pagedItems

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
            <AppPageHeader title="Instruments" extra={[
				<AddButton key='add' url="/instruments/add" />,]}/>
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