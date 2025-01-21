import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../../../hooks";
import { selectSamplesTable } from "../../../selectors";
import { usePagedItemsActionsCallbacks } from "../../pagedItemsTable/usePagedItemsActionCallbacks";
import SamplesTableActions from '../../../modules/samplesTable/actions'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS } from '../../samples/SampleTableColumns'
import { LIBRARY_COLUMN_FILTERS, LIBARY_TABLE_FILTER_KEYS, LIBRARY_COLUMN_DEFINITIONS } from '../../libraries/LibraryTableColumns'
import { useFilteredColumns } from "../../pagedItemsTable/useFilteredColumns";
import AppPageHeader from "../../AppPageHeader";
import PageContent from "../../PageContent";
import PagedItemsTable, { DataObjectsByID, PagedItemsTableProps } from "../../pagedItemsTable/PagedItemsTable";
import { Sample } from "../../../models/frontend_models";
import { SampleAndLibrary } from "../../WorkflowSamplesTable/ColumnSets";
import { fetchSamplesAndLibraries } from "../../../modules/studySamples/services";



export function LabworkSamples() {
    const samplesTableState = useAppSelector(selectSamplesTable)
    const { filters } = samplesTableState
    const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)
    const SAMPLES_TABLE_COLUMNS = [
        SAMPLE_COLUMN_DEFINITIONS.KIND,
        SAMPLE_COLUMN_DEFINITIONS.NAME,
        SAMPLE_COLUMN_DEFINITIONS.PROJECT,
        SAMPLE_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
        SAMPLE_COLUMN_DEFINITIONS.COORDINATES,
        SAMPLE_COLUMN_DEFINITIONS.PARENT_CONTAINER,
        SAMPLE_COLUMN_DEFINITIONS.PARENT_COORDINATES,
        LIBRARY_COLUMN_DEFINITIONS.INDEX_NAME,
        SAMPLE_COLUMN_DEFINITIONS.QC_FLAG,
        SAMPLE_COLUMN_DEFINITIONS.DEPLETED
    ]
    const columns = useFilteredColumns<SampleAndLibrary>(
        SAMPLES_TABLE_COLUMNS,
        useMemo(() => ({...LIBRARY_COLUMN_FILTERS, ...SAMPLE_COLUMN_FILTERS}), []),
        useMemo(() => ({...LIBARY_TABLE_FILTER_KEYS, ...SAMPLE_FILTER_KEYS}), []),
        filters,
        samplesTableCallbacks.setFilterCallback,
        samplesTableCallbacks.setFilterOptionsCallback
    )

    const [sampleAndLibraryList, setSampleAndLibraryList] = useState<SampleAndLibrary[]>([])
    useEffect(() => {
        (async () => {
            setSampleAndLibraryList(await fetchSamplesAndLibraries([...samplesTableState.items]))
        })()
    }, [samplesTableState.items])

    const mapSampleIDs = useCallback((ids: number[]) => {
        const idsSet = new Set(ids)
        const dataObjectsByID = sampleAndLibraryList.reduce<DataObjectsByID<SampleAndLibrary>>((acc, sampleAndLibrary) => {
            if (sampleAndLibrary.sample && idsSet.has(sampleAndLibrary.sample.id)) {
                acc[sampleAndLibrary.sample.id] = sampleAndLibrary
            }
            return acc
        }, {} as Record<string, SampleAndLibrary>)
        return Promise.resolve(dataObjectsByID)
    }, [sampleAndLibraryList])

    const [defaultSelection, setDefaultSelection] = useState(false)
    const [exceptedSampleIDs, setExceptedSampleIDs] = useState<Sample['id'][]>([])
    const sampleCount = defaultSelection ? samplesTableState.totalCount - exceptedSampleIDs.length : exceptedSampleIDs.length
    const selection: NonNullable<PagedItemsTableProps<SampleAndLibrary>['selection']> = useMemo(() => ({
        onSelectionChanged: (selectedItems, selectAll) => {
            setExceptedSampleIDs(selectedItems.map(id => parseInt(id as string)))
            setDefaultSelection(selectAll)
        }
    }), [])

    return (
        <>
            <AppPageHeader title = "Samples and Libraries"/>
            <PageContent>
                <PagedItemsTable<SampleAndLibrary>
                    getDataObjectsByID={mapSampleIDs}
                    pagedItems={samplesTableState}
                    columns={columns}
                    usingFilters={true}
                    initialLoad={false}
                    selection={selection}
                    {...samplesTableCallbacks}
                />
            </PageContent>
        </>
    )
}