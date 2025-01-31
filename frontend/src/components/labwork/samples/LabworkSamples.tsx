import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../../../hooks";
import { selectSamplesTable, selectToken } from "../../../selectors";
import { usePagedItemsActionsCallbacks } from "../../pagedItemsTable/usePagedItemsActionCallbacks";
import SamplesTableActions from '../../../modules/samplesTable/actions'
import { SAMPLE_COLUMN_FILTERS, SAMPLE_FILTER_KEYS, SAMPLE_COLUMN_DEFINITIONS, SampleColumn, ObjectWithSample } from '../../samples/SampleTableColumns'
import { useFilteredColumns } from "../../pagedItemsTable/useFilteredColumns";
import AppPageHeader from "../../AppPageHeader";
import PageContent from "../../PageContent";
import PagedItemsTable, { DataObjectsByID, PagedItemsTableProps } from "../../pagedItemsTable/PagedItemsTable";
import { Sample, Step, Study } from "../../../models/frontend_models";
import { SampleAndLibrary } from "../../WorkflowSamplesTable/ColumnSets";
import { Button, Col, Flex, Row } from "antd";
import { fetchSamples } from "../../../modules/cache/cache";
import api, { dispatchForApi } from "../../../utils/api";
import { FilterSet } from "../../../models/paged_items";

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
    const columns = useFilteredColumns<ObjectWithSample>(
        SAMPLES_TABLE_COLUMNS,
        useMemo(() => SAMPLE_COLUMN_FILTERS, []),
        useMemo(() => SAMPLE_FILTER_KEYS, []),
        filters,
        samplesTableCallbacks.setFilterCallback,
        samplesTableCallbacks.setFilterOptionsCallback
    )

    const [samples, setSamples] = useState<ObjectWithSample[]>([])
    useEffect(() => {
        (async () => {
            setSamples((await fetchSamples(samplesTableState.items)).map(sample => ({ sample: sample as Sample })))
        })()
    }, [samplesTableState.items])

    const mapSampleIDs = useCallback((ids: number[]) => {
        const idsSet = new Set(ids)
        const dataObjectsByID = samples.reduce<DataObjectsByID<ObjectWithSample>>((acc, sample) => {
            if (sample.sample && idsSet.has(sample.sample.id)) {
                acc[sample.sample.id] = sample
            }
            return acc
        }, {} as Record<string, SampleAndLibrary>)
        return Promise.resolve(dataObjectsByID)
    }, [samples])

    const [defaultSelection, setDefaultSelection] = useState(false)
    const [exceptedSampleIDs, setExceptedSampleIDs] = useState<Sample['id'][]>([])
    const sampleSelectionCount = defaultSelection ? samplesTableState.totalCount - exceptedSampleIDs.length : exceptedSampleIDs.length
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
                <Row gutter={16}>
                    <Col span={12}>
                        <PagedItemsTable<ObjectWithSample>
                            getDataObjectsByID={mapSampleIDs}
                            pagedItems={samplesTableState}
                            columns={columns}
                            usingFilters={true}
                            initialLoad={false}
                            selection={selection}
                            simplePagination={true}
                            {...samplesTableCallbacks}
                        />
                    </Col>
                    <Col span={12}>
                        <LabworkSampleActions defaultSelection={defaultSelection} exceptedSampleIDs={exceptedSampleIDs} filters={filters} />
                    </Col>
                </Row>
            </PageContent>
        </>
    )
}

interface LabworkSampleActionsProps {
    defaultSelection: boolean
    exceptedSampleIDs: Sample['id'][]
    filters: FilterSet
}
function LabworkSampleActions({ defaultSelection, exceptedSampleIDs, filters }: LabworkSampleActionsProps) {
    const token = useAppSelector(selectToken)
    const [options, setOptions] = useState<string[]>([])
    const [isFetching, setIsFetching] = useState(false)
    useEffect(() => {
        if (!token) return
        (async () => {
            setIsFetching(true)
            console.info({ defaultSelection, exceptedSampleIDs, filters })
            const sampleIDs = (await dispatchForApi(token,
                api.samples.sample_ids_by_default_selection_excepted_ids(
                    defaultSelection,
                    exceptedSampleIDs,
                    Object.entries(filters).reduce<Record<string, string>>((acc, [key, filter]) => {
                        acc[key] = filter.value?.toString() ?? ''
                        return acc
                    }, {})
                ))
            ).data
            console.info({ sampleIDs })

            if (sampleIDs.length === 0) {
                setOptions([])
                setIsFetching(false)
                return
            }

            const sampleNextSteps = (await dispatchForApi(token, api.sampleNextStep.listSamples(sampleIDs))).data.results
            console.info({ sampleNextSteps })
            type ValueType = [Study['id'], Step['name']]
            const studyStepsBySample = sampleNextSteps.reduce<Record<Sample['id'], ValueType>>((acc, sampleNextStep) => {
                acc[sampleNextStep.sample] = acc[sampleNextStep.sample] ?? []
                for (const study of sampleNextStep.studies) {
                    acc[sampleNextStep.sample] = [study, sampleNextStep.step.name]
                }
                return acc
            }, {})

            const studyStepCount: Record<string, number> = {}
            for (const [sampleID, [study, stepName]] of Object.entries(studyStepsBySample)) {
                const key = `${study}-${stepName}`
                studyStepCount[key] = (studyStepCount[key] ?? 0) + 1
            }
            console.info({ studyStepCount })
            const commonStudySteps = Object.entries(studyStepCount).reduce<ValueType[]>((acc, [key, count]) => {
                if (count === sampleIDs.length) {
                    acc.push(key.split('-') as ValueType)
                }
                return acc
            }, [])

            setOptions(commonStudySteps.map(([studyID, stepName]) => `Dequeue from ${studyID} - ${stepName}`))
            setIsFetching(false)
        })();
    }, [defaultSelection, exceptedSampleIDs, filters, !!token])

return <Flex vertical gap={"middle"}>
        {
            isFetching ? "Fetching options..." : options.map(option => <Button key={option} type="primary">{option}</Button>)
        }
    </Flex>
}