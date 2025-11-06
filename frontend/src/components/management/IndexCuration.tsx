import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FMSPooledSample } from "../../models/fms_api_models"
import { Checkbox, Input, InputRef, Table } from "antd"
import { useAppDispatch } from "../../hooks"
import api from "../../utils/api"
import { SearchOutlined } from "@ant-design/icons"
import { AnyObject as AntdAnyObject } from "antd/es/_util/type"
import { ColumnType } from "antd/lib/table"
import { ColumnsType, TablePaginationConfig } from "antd/es/table"
import { useDebounce } from "../filters/filterComponents/DebouncedInput"
import { SelectionSelectFn, TableRowSelection } from "antd/es/table/interface"

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

type ColumnDefinitions<ColumnID extends string, RowData extends AntdAnyObject> = Record<ColumnID, ColumnType<RowData>>
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

const DEFAULT_PAGE_SIZE = 20
export function IndexCuration() {
    const dispatch = useAppDispatch()
    const [total, setTotal] = useState<number>(0)
    const [pooledSamples, setPooledSamples] = useState<FMSPooledSample[]>([])
    const [filters, setFilters] = useState<Partial<Record<PooledSampleColumnID, string>>>({})
    const [loading, setLoading] = useState<boolean>(false)

    const fetchPooledSamples = useCallback((currentPage: number, pageSize: number, fiters: Partial<Record<PooledSampleColumnID, string>>) => {
        setLoading(true)
        const filterParams = createQueryParamsFromFilters(FILTER_KEYS, FILTER_DESCRIPTIONS, fiters)
        const offset = (currentPage - 1) * pageSize
        const promise = dispatch(api.pooledSamples.list({ ...filterParams, include_pools_of_one: true, derived_sample__library__isnull: false, offset, limit: pageSize }, true))
        promise.then((response) => {
            setTotal(response.data.count)
            setPooledSamples(response.data.results)
        })
        promise.finally(() => setLoading(false))
        return promise
    }, [dispatch])

    const onPaginationChange = useCallback<NonNullable<TablePaginationConfig['onChange']>>((page, pageSize) => {
        fetchPooledSamples(page, pageSize, filters)
    }, [fetchPooledSamples, filters])
    
    const pagination = usePagination(DEFAULT_PAGE_SIZE, total, onPaginationChange)
    const { current: currentPage, pageSize } = pagination

    const { defaultSelection, exceptedItems, rowSelection, resetSelection } = useSmartSelection<FMSPooledSample>(
        total,
        pooledSamples,
        (record) => record.id,
    )
    console.info({
        defaultSelection,
        exceptedItems,
        currentPage,
    })

    // Initial fetch
    useEffect(() => {
        fetchPooledSamples(1, DEFAULT_PAGE_SIZE, {})
    }, [fetchPooledSamples])

    const mySetFilter = useDebounce(useCallback((searchKey: string, text: string) => {
        resetSelection()
        setFilters(prev => {
            const filters = { ...prev, [searchKey]: text }
            fetchPooledSamples(1, pageSize ?? DEFAULT_PAGE_SIZE, filters)
            return filters
        })
    }, [fetchPooledSamples, pageSize, resetSelection]))
    const searchInput = useRef<InputRef>(null)
    const searchDefinitions = useMemo<SearchPropertiesDefinitions<PooledSampleColumnID>>(() => ({
        [PooledSampleColumnID.ALIAS]: { setFilter: mySetFilter, searchInput, searchKey: PooledSampleColumnID.ALIAS, placeholder: 'Name' },
        [PooledSampleColumnID.CONTAINER_BARCODE]: { setFilter: mySetFilter, searchInput, placeholder: 'Container Barcode' },
        [PooledSampleColumnID.COORDINATES]: { setFilter: mySetFilter, searchInput, placeholder: 'Coordinates' },
        [PooledSampleColumnID.INDEX]: { setFilter: mySetFilter, searchInput, placeholder: 'Current Index' },
    }), [mySetFilter])

    const columns = useMemo<ColumnsType<FMSPooledSample>>(() => createTableColumns(
        COLUMN_DEFINITIONS,
        searchDefinitions,
    ), [searchDefinitions])

    return (
        <>
            <Table<FMSPooledSample>
                dataSource={pooledSamples}
                rowKey="id"
                columns={columns}
                loading={loading}
                pagination={pagination}
                rowSelection={rowSelection}
                scroll={{ y: '80vh' }}
            />
        </>
    )
}

function getColumnSearchProps<T = AntdAnyObject>(
    setFilter: (searchKey: string, value: string) => void,
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
                        setFilter(searchKey, e.target.value)
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
                        setFilter(searchKey, '')
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
    setFilter: (dataIndex: string, text: string) => void,
    searchInput: React.RefObject<InputRef>,
    placeholder?: string
}>

function createTableColumns<ColumnID extends string, RowData extends AntdAnyObject>(
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
                searchPropsArgs.setFilter,
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

function usePagination(defaultPageSize: number, total: number, onChange: TablePaginationConfig['onChange']): TablePaginationConfig {
    const [current, setCurrent] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(defaultPageSize)
    const finalOnChange = useCallback<NonNullable<TablePaginationConfig['onChange']>>((page, pageSize) => {
        setCurrent(page)
        setPageSize(pageSize)
        onChange?.(page, pageSize)
    }, [onChange])

    useEffect(() => {
        if ((current - 1) * pageSize > total) {
            setCurrent(1)
        }
    }, [current, pageSize, total])
 
    return useMemo(() => ({
        current,
        pageSize,
        total,
        onChange: finalOnChange,
    }), [current, finalOnChange, pageSize, total])
}

function useSmartSelection<T>(totalCount: number, itemsOnPage: T[], getKey: (record: T) => React.Key, initialExceptedItems?: React.Key[]) {
	const [defaultSelection, setDefaultSelection] = useState(false)
	const [exceptedItems, setExceptedItems] = useState<React.Key[]>(initialExceptedItems ?? [])
	const allIsSelected = (!defaultSelection && exceptedItems.length === totalCount) || (defaultSelection && exceptedItems.length === 0)
	const noneIsSelected = (!defaultSelection && exceptedItems.length === 0) || (defaultSelection && exceptedItems.length === totalCount)

	const setDefaultSelectionAndExceptedItems = useCallback((defaultSelection: boolean, exceptedItems: React.Key[]) => {
		if (defaultSelection && exceptedItems.length === totalCount) {
			setDefaultSelection(false)
			setExceptedItems([])
		} else if (!defaultSelection && exceptedItems.length === totalCount) {
			setDefaultSelection(true)
			setExceptedItems([])
		} else {
			setDefaultSelection(defaultSelection)
			setExceptedItems(exceptedItems)
		}
	}, [totalCount])

	const onSelectAll = useCallback(() => {
		const newExceptedItems: React.Key[] = []
		const newDefaultSelection = !allIsSelected
        setDefaultSelectionAndExceptedItems(newDefaultSelection, newExceptedItems)
	}, [allIsSelected, setDefaultSelectionAndExceptedItems])
	const onSelectSingle = useCallback<SelectionSelectFn<T>>((record: T) => {
		const key = getKey(record)
		let newExceptedItems = exceptedItems
		if (exceptedItems.includes(key)) {
			newExceptedItems = exceptedItems.filter((id) => id !== key)
		} else {
			newExceptedItems = [...exceptedItems, key]
		}
		setDefaultSelectionAndExceptedItems(defaultSelection, newExceptedItems)
	}, [getKey, exceptedItems, setDefaultSelectionAndExceptedItems, defaultSelection])
	const onSelectMultiple = useCallback((keys: React.Key[]) => {
		const newExceptedItems: React.Key[] = []
		const pageItems = itemsOnPage.map((record) => getKey(record))
		if (defaultSelection) {
			const exceptedItemSet = new Set(exceptedItems)
			const currentlySelectedItemsInPage = pageItems.filter((id) => exceptedItemSet.has(id))
			const removedItems = currentlySelectedItemsInPage.filter((id) => keys.includes(id))
			const addedItems = keys.filter((id) => !currentlySelectedItemsInPage.includes(id))
			newExceptedItems.push(...exceptedItems.filter((id) => !addedItems.includes(id)))
			newExceptedItems.push(...removedItems)
		} else {
			const currentlySelectedItemsInPage = exceptedItems.filter((id) => pageItems.includes(id))
			const removedItems = currentlySelectedItemsInPage.filter((id) => !keys.includes(id))
			const addedItems = keys.filter((id) => !currentlySelectedItemsInPage.includes(id))
			newExceptedItems.push(...exceptedItems.filter((id) => !removedItems.includes(id)))
			newExceptedItems.push(...addedItems)
		}
		setDefaultSelectionAndExceptedItems(defaultSelection, newExceptedItems)
	}, [defaultSelection, exceptedItems, getKey, itemsOnPage, setDefaultSelectionAndExceptedItems])

    const selectedRowKeys = useMemo(() =>
		defaultSelection
			? itemsOnPage.map((record) => getKey(record)).filter((key) => !exceptedItems.includes(key))
			: exceptedItems,
	[defaultSelection, itemsOnPage, exceptedItems, getKey])
    const rowSelection = useMemo<TableRowSelection<T>>(() => {
        const indeterminate = !allIsSelected && !noneIsSelected
        return {
            type: 'checkbox',
            selectedRowKeys,
            onChange(selectedRowKeys, selectedRows, info) {
                if (info.type === 'all') {
                    onSelectAll()
                }
                if (info.type === 'multiple') {
                    // shift is held
                    onSelectMultiple(selectedRowKeys)
                }
            },
            onSelect: onSelectSingle,
            columnTitle: (
                <Checkbox
                    checked={!noneIsSelected}
                    indeterminate={indeterminate}
                    onChange={onSelectAll}
                />
            )
        }
	}, [allIsSelected, noneIsSelected, onSelectAll, onSelectSingle, onSelectMultiple, selectedRowKeys])

	const useInitialExceptedItems = useRef(Boolean(initialExceptedItems))
	useEffect(() => {
        setDefaultSelectionAndExceptedItems(
            false,
            useInitialExceptedItems.current
            ? initialExceptedItems ?? []
            : []
        )
		useInitialExceptedItems.current = false // only use initial excepted items once at the beginning
	}, [initialExceptedItems, setDefaultSelectionAndExceptedItems])

    // make sure to reset selections when filters change
    // to avoid confusion for selectAll and selectedItems logic
    const resetSelection = useCallback(() => {
        setDefaultSelectionAndExceptedItems(false, [])
    }, [setDefaultSelectionAndExceptedItems])

    return useMemo(() => ({
        defaultSelection,
        exceptedItems,
        rowSelection,
        resetSelection
    }), [defaultSelection, exceptedItems, resetSelection, rowSelection])
}
