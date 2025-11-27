import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { FMSId, FMSPooledSample, FMSTemplateAction, FMSTemplatePrefillOption } from "../../models/fms_api_models"
import { Space, Table } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import api from "../../utils/api"
import { ColumnDefinitions, createQueryParamsFromFilters, createQueryParamsFromSortBy, FetchRowData, FilterDescriptions, FilterKeys, Filters, newFilterDefinitionsToFilterSet, SearchPropertiesDefinitions, SortKeys, useFilters, usePaginationProps, useSmartSelectionProps, useTableColumnsProps, usePaginatedDataProps, useTableSortByProps } from "../../utils/tableHooks"
import { selectCurrentPreference } from "../../modules/profiles/selectors"
import { FILTER_TYPE } from "../../constants"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { Link } from "react-router-dom"
import { ActionDropdown } from "../../utils/templateActions"
import { PrefilledTemplatesDropdown } from "../../utils/prefillTemplates"
import { smartQuerySetLookup } from "../../utils/functions"
import FiltersBar from "../filters/filtersBar/FiltersBar"

enum PooledSampleColumnID {
    ALIAS = 'ALIAS',
    CONTAINER_BARCODE = 'CONTAINER_BARCODE',
    COORDINATES = 'COORDINATES',
    PROJECT = 'PROJECT',
    INDEX = 'INDEX',
}

const FILTER_KEYS: FilterKeys<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: 'derived_sample__biosample__alias',
    [PooledSampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
    [PooledSampleColumnID.COORDINATES]: 'sample__coordinate__name',
    [PooledSampleColumnID.PROJECT]: 'project__name',
    [PooledSampleColumnID.INDEX]: 'derived_sample__library__index__name',
} as const
const SORT_KEYS: SortKeys<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: 'derived_sample__biosample__alias',
    [PooledSampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
    [PooledSampleColumnID.COORDINATES]: 'sample__coordinate__id',
    [PooledSampleColumnID.PROJECT]: 'project__name',
    [PooledSampleColumnID.INDEX]: 'derived_sample__library__index__name',
}

const FILTER_DESCRIPTIONS: FilterDescriptions<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
    [PooledSampleColumnID.CONTAINER_BARCODE]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
    [PooledSampleColumnID.COORDINATES]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
    [PooledSampleColumnID.PROJECT]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
    [PooledSampleColumnID.INDEX]: { type: FILTER_TYPE.INPUT, lookup_type: 'startswith' },
} as const

const ROW_KEY = "id"

const COLUMN_DEFINITIONS: ColumnDefinitions<PooledSampleColumnID, FMSPooledSample> = {
    [PooledSampleColumnID.ALIAS]: {
        title: 'Name',
        dataIndex: 'alias',
        key: PooledSampleColumnID.ALIAS,
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
    [PooledSampleColumnID.PROJECT]: {
        title: 'Project',
        dataIndex: 'project_name',
        key: PooledSampleColumnID.PROJECT,
        render: (_: any, record: FMSPooledSample) => (
            <Link to={`/projects/${record.project_id}`}>{record.project_name}</Link>
        ),
        sorter: { multiple: 1 }
    },
    [PooledSampleColumnID.INDEX]: {
        title: 'Current Index',
        dataIndex: 'index',
        key: PooledSampleColumnID.INDEX
    },
} as const

const SEARCH_DEFINITIONS: SearchPropertiesDefinitions<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: { placeholder: 'Sample Name' },
    [PooledSampleColumnID.CONTAINER_BARCODE]: { placeholder: 'Container Barcode' },
    [PooledSampleColumnID.COORDINATES]: { placeholder: 'Coordinates' },
    [PooledSampleColumnID.PROJECT]: { placeholder: 'Project Name' },
    [PooledSampleColumnID.INDEX]: { placeholder: 'Index Name' },
}

export function IndexCuration() {
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
        bodySpinStyle: { height: '75vh', alignContent: 'center' }
    })

    const debouncedOnSort = useCallback((newSortBy: Partial<Record<PooledSampleColumnID, 'ascend' | 'descend'>>) => {
        fetchRowData({ sortBy: newSortBy, pageNumber: 1 }, DEBOUNCE_DELAY)
    }, [fetchRowData])
    const [tableSortByProps, { sortBy, setSortBy }] = useTableSortByProps<PooledSampleColumnID, FMSPooledSample>(debouncedOnSort)

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

    const filterSet = useMemo(() => newFilterDefinitionsToFilterSet(filters, FILTER_DESCRIPTIONS, FILTER_KEYS, SEARCH_DEFINITIONS), [filters])

    const fetchRowDataRef = useRef<typeof fetchRowData>()
    useEffect(() => {
        fetchRowDataRef.current = fetchRowData
        fetchRowData({ pageNumber: 1, pageSize: defaultPageSize })
    }, [defaultPageSize, fetchRowData])

    return (
        <>
            <AppPageHeader
				title = "Index Curation"
                extra = {[
                    <ActionDropdown key="actions" urlBase={'/management/index-curations'} actions={templateActions} />,
                    <PrefilledTemplatesDropdown key='prefills' prefillTemplate={prefillTemplate} totalCount={totalSelectionCount} prefills={prefills}/>,
                ]}
			/>
            <PageContent>
                <Space direction={"vertical"} style={{ width: '100%' }}>
                    <FiltersBar filters={filterSet} clearFilters={() => {
                        setFilters({})
                        setSortBy({})
                    }} />
                    <Table<FMSPooledSample>
                        {...paginatedDataProps}
                        {...tableSortByProps}
                        {...smartSelectionProps}
                        {...tableColumnsProps}
                        rowKey={ROW_KEY}
                        scroll={{ y: '75vh' }}
                        bordered
                    />
                </Space>
            </PageContent>
        </>
    )
}

const DEBOUNCE_DELAY = 500