import { ColumnsType, ColumnType, TablePaginationConfig, TableProps } from "antd/es/table"
import { AnyObject as AntdAnyObject } from "antd/es/_util/type"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Checkbox, Input, InputRef } from "antd"
import { SelectionSelectFn, TableRowSelection } from "antd/es/table/interface"
import { useDebounce } from "../components/filters/filterComponents/DebouncedInput"
import { FILTER_TYPE } from "../constants"
import { SearchOutlined } from "@ant-design/icons"

export type ColumnDefinitions<ColumnID extends string, RowData> = Record<ColumnID, ColumnType<RowData>>

export type FilterKeys<ColumnID extends string> = Record<ColumnID, string>

export type FilterDescription = { type: typeof FILTER_TYPE.INPUT, lookup_type: 'exact' | 'startswith' }
export type FilterDescriptions<ColumnID extends string> = Record<ColumnID, FilterDescription>

export interface SearchPropertyDefinition { placeholder?: string }
export type SearchPropertiesDefinitions<ColumnID extends string> = Record<ColumnID, SearchPropertyDefinition>

export type RowKey<RowData extends AntdAnyObject> = NonNullable<TableProps<RowData>['rowKey']>
function getKey<RowData extends AntdAnyObject>(rowKey: RowKey<RowData>, record: RowData): React.Key {
    return rowKey instanceof Function ? rowKey(record) : record[rowKey as keyof RowData] as React.Key
}

interface useBasicTablePropsParameters<ColumnID extends string, RowData extends AntdAnyObject> {
    doFetchInitially?: boolean,
    defaultPageSize: number,
    fetchRowData: (pageNumber: number, pageSize: number, filters: Record<string, string>) => Promise<{ total: number, data: RowData[] }>,
    rowKey: RowKey<RowData>,
    columnDefinitions: ColumnDefinitions<ColumnID, RowData>,
    filterKeys: FilterKeys<ColumnID>,
    filterDescriptions: FilterDescriptions<ColumnID>,
    searchDefinitions: Record<ColumnID, SearchPropertyDefinition>,
}
export function useBasicTableProps<ColumnID extends string, RowData extends AntdAnyObject>({
    doFetchInitially = true,
    defaultPageSize,
    fetchRowData,
    rowKey,
    columnDefinitions,
    filterKeys,
    filterDescriptions,
    searchDefinitions,
}: useBasicTablePropsParameters<ColumnID, RowData>): TableProps<RowData> {
    const { total, dataSource, loading, fetchTableData } = useFetchTableData<ColumnID, RowData>(
        fetchRowData,
        filterKeys,
        filterDescriptions
    )

    // Initial fetch
    useEffect(() => {
        if (doFetchInitially)
            fetchTableData(1, defaultPageSize, {})
    }, [defaultPageSize, doFetchInitially, fetchTableData])

    const [filters, setFilters] = useState<Partial<Record<ColumnID, string>>>({})

    const onPaginationChange = useCallback<NonNullable<TablePaginationConfig['onChange']>>((page, pageSize) => {
        fetchTableData(page, pageSize, filters)
    }, [fetchTableData, filters])
    const [pagination, changePagination] = usePagination(defaultPageSize, total, onPaginationChange)

    const { rowSelection, resetSelection } = useSmartSelection<RowData>(
        total,
        dataSource,
        rowKey,
    )

    const { pageSize } = pagination
    const mySetFilter = useDebounce(useCallback((searchKey: ColumnID, text: string) => {
        setFilters(prev => {
            resetSelection()
            changePagination(1, pageSize ?? defaultPageSize)
            const filters = { ...prev, [searchKey]: text }
            fetchTableData(1, pageSize ?? defaultPageSize, filters)
            return filters
        })
    }, [changePagination, defaultPageSize, fetchTableData, pageSize, resetSelection]))

    const columns = useTableColumns(
        columnDefinitions,
        searchDefinitions,
        mySetFilter
    )

    return {
            dataSource,
            rowKey,
            columns,
            loading,
            pagination,
            rowSelection,
        }
}

function useFetchTableData<ColumnID extends string, RowData extends AntdAnyObject>(
    fetchData: (pageNumber: number, pageSize: number, filters: Record<string, string>) => Promise<{ total: number, data: RowData[] }>,
    filterKeys: FilterKeys<ColumnID>,
    filterDescriptions: FilterDescriptions<ColumnID>,
) {
    const [total, setTotal] = useState<number>(0)
    const [dataSource, setDataSource] = useState<RowData[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    const fetchTableData = useCallback(async (pageNumber: number, pageSize: number, filters: Partial<Record<ColumnID, string>>) => {
        const filterParams = createQueryParamsFromFilters(filterKeys, filterDescriptions, filters)
        setLoading(true)
        const result = await fetchData(pageNumber, pageSize, filterParams)
        setTotal(result.total)
        setDataSource(result.data)
        setLoading(false)
    }, [fetchData, filterDescriptions, filterKeys])

    return useMemo(() => ({ total, dataSource, loading, fetchTableData }), [dataSource, fetchTableData, loading, total])
}

function createQueryParamsFromFilters<ColumnID extends string>(filterKeys: FilterKeys<ColumnID>, descriptions: FilterDescriptions<ColumnID>, filters: Partial<Record<ColumnID, string>>): Record<string, string> {
    return Object.entries(filters).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value) {
            const filterKey = filterKeys[key as ColumnID]
            const description = descriptions[key as ColumnID]
            if (description === undefined) {
                acc[filterKey] = value as string
            } else if (description.type === FILTER_TYPE.INPUT) {
                acc[`${filterKey}__${description.lookup_type}`] = value as string
            }
        }
        return acc
    }, {})
}

function usePagination(defaultPageSize: number, total: number, onChange: TablePaginationConfig['onChange']): [TablePaginationConfig, NonNullable<TablePaginationConfig['onChange']>] {
    const [current, setCurrent] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(defaultPageSize)

    const finalOnChange = useCallback<NonNullable<TablePaginationConfig['onChange']>>((page, pageSize) => {
        setCurrent(page)
        setPageSize(pageSize)
        onChange?.(page, pageSize)
    }, [onChange])

    useEffect(() => {
        // Reset page size and current page if defaultPageSize changes
        finalOnChange(1, defaultPageSize)
    }, [defaultPageSize, finalOnChange])

    useEffect(() => {
        if ((current - 1) * pageSize > total) {
            finalOnChange(1, pageSize)
        }
    }, [current, finalOnChange, pageSize, total])

    return useMemo(() => [
        {
            current,
            pageSize,
            total,
            onChange: finalOnChange,
        },
        (page: number, pageSize: number) => {
            setCurrent(page)
            setPageSize(pageSize)
        }
    ], [current, finalOnChange, pageSize, total])
}

function useTableColumns<ColumnID extends string, RowData extends AntdAnyObject>(
    columnDefinitions: ColumnDefinitions<ColumnID, RowData>,
    searchPropertyDefinitions: SearchPropertiesDefinitions<ColumnID>,
    setFilter: (searchKey: ColumnID, value: string) => void,
): ColumnsType<RowData> {
    const searchInput = useRef<InputRef>(null)
    return useMemo(() => {
        const columns: ColumnsType<RowData> = []
        for (const columnID in columnDefinitions) {
            const column = {}
            Object.assign(column, columnDefinitions[columnID])

            const searchPropsArgs = searchPropertyDefinitions[columnID]
            if (searchPropsArgs) {
                Object.assign(column, getColumnSearchProps(
                    setFilter,
                    columnID,
                    searchInput,
                    searchPropsArgs.placeholder
                ))
            }
            columns.push(column)
        }
        return columns
    }, [columnDefinitions, searchPropertyDefinitions, setFilter])
}

function getColumnSearchProps<SearchKey extends string, T = AntdAnyObject>(
    setFilter: (searchKey: SearchKey, value: string) => void,
    searchKey: SearchKey,
    searchInput: React.RefObject<InputRef>,
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

function useSmartSelection<RowData extends AntdAnyObject>(totalCount: number, itemsOnPage: RowData[], rowKey: RowKey<RowData>, initialExceptedItems?: React.Key[]) {
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
	const onSelectSingle = useCallback<SelectionSelectFn<RowData>>((record: RowData) => {
		const key = getKey(rowKey, record)
		let newExceptedItems = exceptedItems
		if (exceptedItems.includes(key)) {
			newExceptedItems = exceptedItems.filter((id) => id !== key)
		} else {
			newExceptedItems = [...exceptedItems, key]
		}
		setDefaultSelectionAndExceptedItems(defaultSelection, newExceptedItems)
	}, [rowKey, exceptedItems, setDefaultSelectionAndExceptedItems, defaultSelection])
	const onSelectMultiple = useCallback((keys: React.Key[]) => {
		const newExceptedItems: React.Key[] = []
		const pageItems = itemsOnPage.map((record) => getKey(rowKey, record))
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
	}, [defaultSelection, exceptedItems, itemsOnPage, rowKey, setDefaultSelectionAndExceptedItems])

    const selectedRowKeys = useMemo(() =>
		defaultSelection
			? itemsOnPage.map((record) => getKey(rowKey, record)).filter((key) => !exceptedItems.includes(key))
			: exceptedItems,
	[defaultSelection, itemsOnPage, exceptedItems, rowKey])
    const rowSelection = useMemo<TableRowSelection<RowData>>(() => {
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
