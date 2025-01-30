import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../../../hooks";
import { selectSamplesTable } from "../../../selectors";
import { usePagedItemsActionsCallbacks } from "../../pagedItemsTable/usePagedItemsActionCallbacks";
import SamplesTableActions from '../../../modules/samplesTable/actions'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS, SampleColumn } from '../../samples/SampleTableColumns'
import { useFilteredColumns } from "../../pagedItemsTable/useFilteredColumns";
import AppPageHeader from "../../AppPageHeader";
import PageContent from "../../PageContent";
import PagedItemsTable, { DataObjectsByID, PagedItemsTableProps } from "../../pagedItemsTable/PagedItemsTable";
import { Sample } from "../../../models/frontend_models";
import { SampleAndLibrary } from "../../WorkflowSamplesTable/ColumnSets";
import { fetchSamplesAndLibraries } from "../../../modules/studySamples/services";
import { Col, Row } from "antd";

export function LabworkSamples() {
    const samplesTableState = useAppSelector(selectSamplesTable)
    const { filters } = samplesTableState

    const samplesTableCallbacks = usePagedItemsActionsCallbacks(SamplesTableActions)
    const SAMPLES_TABLE_COLUMNS: SampleColumn[] = useMemo(() => [
        SAMPLE_COLUMN_DEFINITIONS.NAME,
        SAMPLE_COLUMN_DEFINITIONS.CONTAINER_BARCODE,
        SAMPLE_COLUMN_DEFINITIONS.PARENT_CONTAINER,
        SAMPLE_COLUMN_DEFINITIONS.PARENT_COORDINATES,
        SAMPLE_COLUMN_DEFINITIONS.PROJECT,
    ], [])
    const columns = useFilteredColumns<SampleAndLibrary>(
        SAMPLES_TABLE_COLUMNS,
        useMemo(() => SAMPLE_COLUMN_FILTERS, []),
        useMemo(() => SAMPLE_FILTER_KEYS, []),
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
    const sampleSelectionCount = defaultSelection ? samplesTableState.totalCount - exceptedSampleIDs.length : exceptedSampleIDs.length
    const selection: NonNullable<PagedItemsTableProps<SampleAndLibrary>['selection']> = useMemo(() => ({
        onSelectionChanged: (selectedItems, selectAll) => {
            setExceptedSampleIDs(selectedItems.map(id => parseInt(id as string)))
            setDefaultSelection(selectAll)
        }
    }), [])

    const samplesTableElement = useMemo(() => {
        return (<PagedItemsTable<SampleAndLibrary>
            getDataObjectsByID={mapSampleIDs}
            pagedItems={samplesTableState}
            columns={columns}
            usingFilters={true}
            initialLoad={false}
            selection={selection}
            simplePagination={true}
            {...samplesTableCallbacks}
        />)
    }, [columns, mapSampleIDs, samplesTableCallbacks, samplesTableState, selection])

    return (
        <>
            <AppPageHeader title = "Samples and Libraries"/>
            <PageContent>
                <Row gutter={16}>
                    <Col span={12}>{samplesTableElement}</Col>
                    <Col span={12}>Bacon</Col>
                </Row>
            </PageContent>
        </>
    )
}
