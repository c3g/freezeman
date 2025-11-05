import React, { useEffect, useMemo, useRef, useState } from "react"
import { FMSPooledSample } from "../../models/fms_api_models"
import { Input, InputRef, Table } from "antd"
import { useAppDispatch } from "../../hooks"
import api from "../../utils/api"
import { SearchOutlined } from "@ant-design/icons"
import { AnyObject as ReactAnyObject } from "antd/es/_util/type"
import { ColumnType } from "antd/lib/table"
import { ColumnsType } from "antd/es/table"
import { useDebounce } from "../filters/filterComponents/DebouncedInput"

enum PooledSampleColumnID {
    ALIAS = 'ALIAS',
    CONTAINER_BARCODE = 'CONTAINER_BARCODE',
    COORDINATES = 'COORDINATES',
    INDEX = 'INDEX',
}

type FilterKeys<ColumnID extends string> = Record<ColumnID, string>
const FILTER_KEYS: FilterKeys<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: 'derived_sample__biosample__alias',
    [PooledSampleColumnID.CONTAINER_BARCODE]: 'sample__container__barcode',
    [PooledSampleColumnID.COORDINATES]: 'sample__coordinate__name',
    [PooledSampleColumnID.INDEX]: 'derived_sample__library__index__name',
} as const

type FilterDescription = { type: 'startswith' }
type FilterDescriptions<ColumnID extends string> = Record<ColumnID, FilterDescription>
const FILTER_DESCRIPTIONS: FilterDescriptions<PooledSampleColumnID> = {
    [PooledSampleColumnID.ALIAS]: { type: 'startswith' },
    [PooledSampleColumnID.CONTAINER_BARCODE]: { type: 'startswith' },
    [PooledSampleColumnID.COORDINATES]: { type: 'startswith' },
    [PooledSampleColumnID.INDEX]: { type: 'startswith' },
} as const

type ColumnDefinitions<ColumnID extends string, RowData extends ReactAnyObject> = Record<ColumnID, ColumnType<RowData>>
const COLUMN_DEFINITIONS: ColumnDefinitions<PooledSampleColumnID, FMSPooledSample> = {
    [PooledSampleColumnID.ALIAS]: {
        title: 'Name',
        dataIndex: 'alias',
        key: 'alias'
    },
    [PooledSampleColumnID.CONTAINER_BARCODE]: {
        title: 'Container Barcode',
        dataIndex: 'container_barcode',
        key: 'container_barcode'
    },
    [PooledSampleColumnID.COORDINATES]: {
        title: 'Coordinates',
        dataIndex: 'coordinates',
        key: 'coordinates'
    },
    [PooledSampleColumnID.INDEX]: {
        title: 'Current Index',
        dataIndex: 'index',
        key: 'index'
    },
} as const

export function IndexCuration() {
    const [filters, setFilters] = useState<Partial<Record<PooledSampleColumnID, string>>>({})
    const [pooledSamples, setPooledSamples] = useState<FMSPooledSample[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const dispatch = useAppDispatch()
    useEffect(() => {
        const filterParams = createQueryParamsFromFilters(FILTER_KEYS, FILTER_DESCRIPTIONS, filters)
        setLoading(true)
        dispatch(api.pooledSamples.list({ ...filterParams, include_pools_of_one: true, derived_sample__library__isnull: false, limit: 10 }, true)).then((response) => {
            setPooledSamples(response.data.results)
        }).finally(() => {
            setLoading(false)
        })
    }, [dispatch, filters])

    const search = useDebounce((searchKey: string, text: string) => setFilters(prev => ({ ...prev, [searchKey]: text })))
    const searchInput = useRef<InputRef>(null)
    const searchDefinitions = useMemo<SearchPropertiesDefinitions<PooledSampleColumnID>>(() => ({
        [PooledSampleColumnID.ALIAS]: { search, searchInput, searchKey: PooledSampleColumnID.ALIAS, placeholder: 'Name' },
        [PooledSampleColumnID.CONTAINER_BARCODE]: { search, searchInput, placeholder: 'Container Barcode' },
        [PooledSampleColumnID.COORDINATES]: { search, searchInput, placeholder: 'Coordinates' },
        [PooledSampleColumnID.INDEX]: { search, searchInput, placeholder: 'Current Index' },
    }), [search])

    const columns = useMemo<ColumnsType<FMSPooledSample>>(() => createTableColumns(
        COLUMN_DEFINITIONS,
        searchDefinitions,
    ), [searchDefinitions])

    console.info({
        pooledSamples,
        columns,
        loading,
        filters
    })
    return (
        <>
            <Table<FMSPooledSample>
                dataSource={pooledSamples}
                rowKey="id"
                columns={columns}
                loading={loading}
            />
        </>
    )
}

function getColumnSearchProps<T = ReactAnyObject>(
    search: (searchKey: string, value: string) => void,
    searchInput: React.RefObject<InputRef>,
    searchKey: string,
    placeholder?: string
): ColumnType<T> {
    return {
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={`Search ${placeholder ?? searchKey}`}
                    value={selectedKeys[0]}
                    onChange={(e) => {
                        search(searchKey, e.target.value)
                    }}
                    onPressEnter={() => {
                        confirm()
                    }}
                    onKeyDown={(ev) => {
                        if (ev.key === 'Escape') {
                            ev.stopPropagation()
                            close()
                        }
                    }}
                    onClear={() => {
                        confirm()
                        search(searchKey, '')
                    }}
                    allowClear
                    style={{ marginBottom: 8 }}
                />
            </div>
        ),
        filterIcon: (filtered: boolean) => (
            <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
        ),
        filterDropdownProps: {
            onOpenChange(open) {
                if (open) {
                    setTimeout(() => searchInput.current?.select(), 100)
                }
            },
        },
    }
}

type SearchPropertiesDefinitions<ColumnID extends string> = Record<ColumnID, {
    search: (dataIndex: string, text: string) => void,
    searchInput: React.RefObject<InputRef>,
    placeholder?: string
}>

function createTableColumns<ColumnID extends string, RowData extends ReactAnyObject>(
    columnDefinitions: ColumnDefinitions<ColumnID, RowData>,
    searchPropertyDefinitions: SearchPropertiesDefinitions<ColumnID>
): ColumnsType<RowData> {
    const columns: ColumnsType<RowData> = []
    for (const columnID in columnDefinitions) {
        const column = {}
        Object.assign(column, columnDefinitions[columnID])

        const searchPropsArgs = searchPropertyDefinitions[columnID]
        if (searchPropsArgs) {
            Object.assign(column, getColumnSearchProps(
                searchPropsArgs.search,
                searchPropsArgs.searchInput,
                columnID,
                searchPropsArgs.placeholder
            ))
        }
        columns.push(column)
    }
    return columns
}

function createQueryParamsFromFilters<ColumnID extends string>(filterKeys: FilterKeys<ColumnID>, descriptions: FilterDescriptions<ColumnID>, filters: Partial<Record<ColumnID, string>>): Record<string, string> {
    return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value) {
            const filterKey = filterKeys[key as ColumnID]
            const description = descriptions[key as ColumnID]
            if (description.type === 'startswith') {
                acc[`${filterKey}__startswith`] = value as string // this is very clearly string but typescript cannot infer that
            } else {
                acc[filterKey] = value as string
            }
        }
        return acc
    }, {})
}