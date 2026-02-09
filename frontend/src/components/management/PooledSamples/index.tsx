import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import { selectCurrentPreference } from "../../../modules/profiles/selectors"
import { ColumnDefinitions, createQueryParamsFromFilters, createQueryParamsFromSortBy, FetchRowData, FilterDescriptions, FilterKeys, Filters, newFilterDefinitionsToFilterSet, SearchPropertiesDefinitions, SortKeys, useFilters, usePaginatedDataProps, useSmartSelectionProps, useTableColumnsProps, useTableSortByProps } from "../../../utils/tableHooks"
import { FMSId, FMSPooledSample, FMSTemplateAction, FMSTemplatePrefillOption } from "../../../models/fms_api_models"
import { FILTER_TYPE } from "../../../constants"
import api from "../../../utils/api"
import { Link } from "react-router-dom"
import { smartQuerySetLookup } from "../../../utils/functions"
import { Button, Space, Table } from "antd"
import AppPageHeader from "../../AppPageHeader"
import FiltersBar from "../../filters/filtersBar/FiltersBar"
import PageContent from "../../PageContent"
import { EditOutlined } from "@ant-design/icons"
import PrefillTemplateButton from "../../PrefillTemplateButton"

export enum PooledSampleColumnID {
    ALIAS = 'ALIAS',
    NAME = 'NAME',
    CONTAINER_BARCODE = 'CONTAINER_BARCODE',
    COORDINATES = 'COORDINATES',
    PROJECT = 'PROJECT',
    INDEX = 'INDEX',
}

const FILTER_KEYS: FilterKeys<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: 'derived_sample__biosample__alias',
    [PooledSampleColumnID.NAME]: 'sample__name',
    [PooledSampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
    [PooledSampleColumnID.COORDINATES]: 'sample__coordinate__name',
    [PooledSampleColumnID.PROJECT]: 'project__name',
    [PooledSampleColumnID.INDEX]: 'derived_sample__library__index__name',
} as const
const SORT_KEYS: SortKeys<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: 'derived_sample__biosample__alias',
    [PooledSampleColumnID.NAME]: 'sample__name',
    [PooledSampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
    [PooledSampleColumnID.COORDINATES]: 'sample__coordinate__id',
    [PooledSampleColumnID.PROJECT]: 'project__name',
    [PooledSampleColumnID.INDEX]: 'derived_sample__library__index__name',
}

const FILTER_DESCRIPTIONS: FilterDescriptions<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
    [PooledSampleColumnID.NAME]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
    [PooledSampleColumnID.CONTAINER_BARCODE]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
    [PooledSampleColumnID.COORDINATES]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
    [PooledSampleColumnID.PROJECT]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
    [PooledSampleColumnID.INDEX]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: false },
} as const

const ROW_KEY = "id"

const COLUMN_DEFINITIONS: ColumnDefinitions<PooledSampleColumnID, FMSPooledSample> = {
    [PooledSampleColumnID.ALIAS]: {
        title: 'Sample Alias',
        dataIndex: 'alias',
        key: PooledSampleColumnID.ALIAS,
        sorter: { multiple: 1 }
    },
    [PooledSampleColumnID.NAME]: {
        title: 'Sample Name',
        dataIndex: 'sample_name',
        key: PooledSampleColumnID.NAME,
        render: (_: any, record: FMSPooledSample) => (
            <Link to={`/samples/${record.parent_sample_id}`}>{record.parent_sample_name}</Link>
        ),
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
        title: 'Index Name',
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

export interface PooledSamplesProps {
    columns: readonly PooledSampleColumnID[]
    tableHeight: number | string
    title: string
    actionUrlBase: string
    templateAction?: FMSTemplateAction
    templatePrefill?: FMSTemplatePrefillOption
}
export function PooledSamples({ columns, tableHeight, title, actionUrlBase, templateAction, templatePrefill }: PooledSamplesProps) {
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
        bodySpinStyle: useMemo(() => ({ height: tableHeight, alignContent: 'center' }), [tableHeight])
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
        columnDefinitions: Object.entries(COLUMN_DEFINITIONS).reduce((acc, [columnID, definition]) => {
            if (columns.includes(columnID as PooledSampleColumnID)) {
                acc[columnID as PooledSampleColumnID] = definition
            }
            return acc
        }, {} as typeof COLUMN_DEFINITIONS),
        searchPropertyDefinitions: SEARCH_DEFINITIONS,
        sortBy,
    })

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

    const appPageHeaderExtra = useMemo(() => {
        const extra: React.ReactNode[] = []
        if (templateAction) {
            extra.push(
                <Link key={"action"} to={`${actionUrlBase}/actions/${templateAction.id}/`}>
                    <Button icon={<EditOutlined />}>
                        Submit Template
                    </Button>
                </Link>
            )
        }
        if (templatePrefill) {
            extra.push(
                <PrefillTemplateButton
                    style={{ width: '100%', border: 0, textAlign: 'left' }}
                    key={'prefill'}
                    exportFunction={prefillTemplate}
                    filename={templatePrefill.description}
                    description={templatePrefill.description}
                    itemsCount={totalSelectionCount}
                    template={templatePrefill.id}
                    icon={<EditOutlined />}
                />
            )
        }
        return extra
    }, [actionUrlBase, prefillTemplate, templateAction, templatePrefill, totalSelectionCount])

    return (
        <>
            <AppPageHeader
				title = {title}
                extra = {appPageHeaderExtra}
			/>
            <PageContent>
                <Space orientation={"vertical"} style={{ width: '100%' }}>
                    <FiltersBar filters={filterSet} clearFilters={() => {
                        setFilters({})
                    }} />
                    <Table<FMSPooledSample>
                        {...paginatedDataProps}
                        {...tableSortByProps}
                        {...smartSelectionProps}
                        {...tableColumnsProps}
                        rowKey={ROW_KEY}
                        scroll={{ y: tableHeight }}
                        bordered
                    />
                </Space>
            </PageContent>
        </>
    )
}
export default PooledSamples
