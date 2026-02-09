import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ColumnDefinitions, createQueryParamsFromFilters, createQueryParamsFromSortBy, FetchRowData, FilterDescriptions, FilterKeys, Filters, newFilterDefinitionsToFilterSet, SearchPropertiesDefinitions, SortKeys, useFilters, usePaginatedDataProps, useSmartSelectionProps, useTableColumnsProps, useTableSortByProps } from "../../../utils/tableHooks"
import { FILTER_TYPE } from "../../../constants"
import { FMSId, FMSPooledSample, FMSTemplateAction, FMSTemplatePrefillOption } from "../../../models/fms_api_models"
import { Link } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import { selectCurrentPreference } from "../../../modules/profiles/selectors"
import api from "../../../utils/api"
import { smartQuerySetLookup } from "../../../utils/functions"
import AppPageHeader from "../../AppPageHeader"
import { ActionDropdown } from "../../../utils/templateActions"
import { PrefilledTemplatesDropdown } from "../../../utils/prefillTemplates"
import PageContent from "../../PageContent"
import { Space, Table } from "antd"
import FiltersBar from "../../filters/filtersBar/FiltersBar"

enum PooledSampleColumnID {
    ALIAS = 'ALIAS',
    NAME = 'NAME',
    CONTAINER_BARCODE = 'CONTAINER_BARCODE',
    COORDINATES = 'COORDINATES',
    INDEX = 'INDEX',
}

const FILTER_KEYS: FilterKeys<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: 'derived_sample__biosample__alias',
    [PooledSampleColumnID.NAME]: 'sample__name',
    [PooledSampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
    [PooledSampleColumnID.COORDINATES]: 'sample__coordinate__name',
    [PooledSampleColumnID.INDEX]: 'derived_sample__library__index__name',
} as const
const SORT_KEYS: SortKeys<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: 'derived_sample__biosample__alias',
    [PooledSampleColumnID.NAME]: 'sample__name',
    [PooledSampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
    [PooledSampleColumnID.COORDINATES]: 'sample__coordinate__id',
    [PooledSampleColumnID.INDEX]: 'derived_sample__library__index__name',
}

const FILTER_DESCRIPTIONS: FilterDescriptions<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
    [PooledSampleColumnID.NAME]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
    [PooledSampleColumnID.CONTAINER_BARCODE]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
    [PooledSampleColumnID.COORDINATES]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
    [PooledSampleColumnID.INDEX]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
} as const

const ROW_KEY = "id"

const COLUMN_DEFINITIONS: ColumnDefinitions<PooledSampleColumnID, FMSPooledSample> = {
    [PooledSampleColumnID.ALIAS]: {
        title: 'Name',
        dataIndex: 'alias',
        key: PooledSampleColumnID.ALIAS,
        sorter: { multiple: 1 }
    },
    [PooledSampleColumnID.NAME]: {
        title: 'Sample Name',
        dataIndex: 'sample_name',
        key: PooledSampleColumnID.NAME,
        sorter: { multiple: 1 }
    },
    [PooledSampleColumnID.CONTAINER_BARCODE]: {
        title: 'Container Barcode',
        dataIndex: 'container_barcode',
        key: PooledSampleColumnID.CONTAINER_BARCODE,
        render: (_: any, record: FMSPooledSample) => (
            <Link to={`/containers/${record.container_id}`}>{record.container_barcode}</Link>
        ),
        sorter: { multiple: 1 }
    },
    [PooledSampleColumnID.COORDINATES]: {
        title: 'Coordinates',
        dataIndex: 'coordinates',
        key: PooledSampleColumnID.COORDINATES,
        width: 150,
        align: 'center',
        sorter: { multiple: 1 }
    },
    [PooledSampleColumnID.INDEX]: {
        title: 'Current Index',
        dataIndex: 'index',
        key: PooledSampleColumnID.INDEX
    },
} as const

const SEARCH_DEFINITIONS: SearchPropertiesDefinitions<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: { placeholder: 'Sample Alias' },
    [PooledSampleColumnID.NAME]: { placeholder: 'Sample Name' },
    [PooledSampleColumnID.CONTAINER_BARCODE]: { placeholder: 'Container Barcode' },
    [PooledSampleColumnID.COORDINATES]: { placeholder: 'Coordinates' },
    [PooledSampleColumnID.INDEX]: { placeholder: 'Index Name' },
}

export function SampleRename() {
    const dispatch = useAppDispatch()
    const defaultPageSize = useAppSelector(state => selectCurrentPreference(state, 'table.sample.page-limit'))
    const fetchPooledSamples = useCallback<FetchRowData<PooledSampleColumnID, FMSPooledSample>>(async ({
        pageNumber, pageSize, filters, sortBy
    }) => {
        const response = await dispatch(api.pooledSamples.list(
            {
                ...createQueryParamsFromFilters(FILTER_KEYS, FILTER_DESCRIPTIONS, filters),
                ...createQueryParamsFromSortBy(SORT_KEYS, sortBy),
                include_pools_of_one: true, derived_sample__library__isnull: false,
                offset: (pageNumber - 1) * pageSize,
                limit: pageSize,
            },
            {
                abort: true,
                requestID: 'IndexCuration.fetchPooledSamples'
            }
        ))
        return {
            total: response.data.count,
            data: response.data.results
        }
    }, [dispatch])

    const [paginatedDataProps, { fetchRowData, totalCount }] = usePaginatedDataProps({
        defaultPageSize,
        fetchRowData: fetchPooledSamples,
        bodySpinStyle: useMemo(() => ({ height: TABLE_HEIGHT, alignContent: 'center' }), [])
    })

    const DEBOUNCE_DELAY = 500
    const debouncedOnSort = useCallback((newSortBy: Partial<Record<PooledSampleColumnID, 'ascend' | 'descend'>>) => {
        fetchRowData({ sortBy: newSortBy, pageNumber: 1 }, DEBOUNCE_DELAY)
    }, [fetchRowData])
    const [tableSortByProps, { sortBy }] = useTableSortByProps<PooledSampleColumnID, FMSPooledSample>(debouncedOnSort)

    const [
        smartSelectionProps,
        {
            resetSelection,
            defaultSelection,
            exceptedItems,
            totalSelectionCount
        }
    ] = useSmartSelectionProps<FMSPooledSample>({
        totalCount: totalCount ?? 0,
        itemsOnPage: paginatedDataProps.dataSource,
        rowKey: ROW_KEY,
    })

    const debouncedOnFilter = useCallback((newFilters: Filters<PooledSampleColumnID>) => {
        resetSelection()
        fetchRowData({ filters: newFilters, pageNumber: 1 }, DEBOUNCE_DELAY)
    }, [fetchRowData, resetSelection])
    const [filters, setFilters] = useFilters<PooledSampleColumnID>({}, debouncedOnFilter)

    const tableColumnsProps = useTableColumnsProps<PooledSampleColumnID, FMSPooledSample>({
        filters,
        setFilters,
        filterDescriptions: FILTER_DESCRIPTIONS,
        columnDefinitions: COLUMN_DEFINITIONS,
        searchPropertyDefinitions: SEARCH_DEFINITIONS,
        sortBy,
    })

    const [templateActions, setTemplateActions] = useState<{ items: FMSTemplateAction[] }>({ items: [] })
    useEffect(() => {
        dispatch(api.pooledSamples.template.actions()).then(response => {
            setTemplateActions({
                items: response.data
            })
        })
    }, [dispatch])

    const [prefills, setPrefills] = useState<{ items: FMSTemplatePrefillOption[] }>({ items: [] })
    useEffect(() => {
        dispatch(api.pooledSamples.prefill.templates()).then(response => {
            setPrefills({
                items: response.data
            })
        })
    }, [dispatch])

    const prefillTemplate = useCallback(({ template }: { template: FMSId }) => {
        return dispatch(api.pooledSamples.prefill.request(
            {
                ...createQueryParamsFromFilters(FILTER_KEYS, FILTER_DESCRIPTIONS, filters),
                ...createQueryParamsFromSortBy(FILTER_KEYS, sortBy),
                ...smartQuerySetLookup('id', defaultSelection, exceptedItems.map(id => Number(id))),
            },
            template
        ))
    }, [defaultSelection, dispatch, exceptedItems, filters, sortBy])

    const filterSet = useMemo(() => Object.entries(filters).reduce((acc, [columnID, filterValue]) => {
        const filterDescription = FILTER_DESCRIPTIONS[columnID as PooledSampleColumnID]
        if (!filterDescription) {
            return acc
        }
        return {
            ...acc,
            ...newFilterDefinitionsToFilterSet(
                columnID as PooledSampleColumnID,
                filterValue,
                filterDescription,
                SEARCH_DEFINITIONS[columnID as PooledSampleColumnID]
            )
        }
    }, {} as ReturnType<typeof newFilterDefinitionsToFilterSet>), [filters])

    useEffect(() => {
        fetchRowData({ pageNumber: 1, pageSize: defaultPageSize })
    }, [defaultPageSize, fetchRowData])

    return (
        <>
            <AppPageHeader
				title = "Sample Rename"
                extra = {[
                    <ActionDropdown key="actions" urlBase={'/management/sample-rename'} actions={templateActions} />,
                    <PrefilledTemplatesDropdown key='prefills' prefillTemplate={prefillTemplate} totalCount={totalSelectionCount} prefills={prefills}/>,
                ]}
			/>
            <PageContent>
                <Space direction={"vertical"} style={{ width: '100%' }}>
                    <FiltersBar filters={filterSet} clearFilters={() => {
                        setFilters({})
                    }} />
                    <Table<FMSPooledSample>
                        {...paginatedDataProps}
                        {...tableSortByProps}
                        {...smartSelectionProps}
                        {...tableColumnsProps}
                        rowKey={ROW_KEY}
                        scroll={{ y: TABLE_HEIGHT }}
                        bordered
                    />
                </Space>
            </PageContent>
        </>
    )
}
export default SampleRename

const TABLE_HEIGHT = '75vh'