import { ColumnsType, ColumnType, TableProps } from "antd/es/table"
import { AnyObject as AntdAnyObject } from "antd/es/_util/type"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Checkbox, Input, InputRef } from "antd"
import { SelectionSelectFn, TableRowSelection } from "antd/es/table/interface"
import { FILTER_TYPE } from "../constants"
import { SearchOutlined } from "@ant-design/icons"
import { useDebouncedEffect } from "../components/filters/filterComponents/DebouncedInput"
import { FilterSet as OldFilterSet, FilterDescription as OldFilterDescription, FilterValue as OldFilterValue } from "../models/paged_items"

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

export function usePaginatedDataProps<ColumnID extends string, RowData extends AntdAnyObject>(
    defaultPageSize: number,
    fetchRowData: FetchRowData<ColumnID, RowData>,
    filters: Partial<Record<ColumnID, string>>,
) {
    const { pagination, setTotal } = usePagination(defaultPageSize)
    
    const { current: currentPage, pageSize } = pagination
    
    const [dataSource, setDataSource] = useState<RowData[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const debouncedEffect = useCallback(() => {
        if (currentPage !== undefined && pageSize !== undefined) {
            setLoading(true)
            fetchRowData(
                currentPage, pageSize, filters
            ).then(({ total: newTotal, data }) => {
                setDataSource(data)
                setTotal(newTotal)
            }).catch((e) => {
                console.error('Error fetching data for table:', e)
            }).finally(() => {
                setLoading(false)
            })
        }
    }, [currentPage, pageSize, fetchRowData, filters, setTotal])
    useDebouncedEffect(debouncedEffect)

    return {
        dataSource,
        loading,
        pagination,
    }
}

function usePagination(defaultPageSize: number) {
    const [total, setTotal] = useState<number>(0)
    const [current, setCurrent] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(defaultPageSize)

    const setCurrentPageAndPageSize = useCallback((newCurrentPage?: number, newPageSize?: number) => {
        newCurrentPage = newCurrentPage ?? current
        newPageSize = newPageSize ?? pageSize
        if ((newCurrentPage - 1) * newPageSize >= total) {
            newCurrentPage = newPageSize > 0 ? Math.max(Math.ceil(total / newPageSize), 1) : 1
        }
        if (newPageSize !== pageSize) {
            newCurrentPage = 1
        }

        setCurrent(newCurrentPage)
        setPageSize(newPageSize)
    }, [current, pageSize, total])

    // Reset page size and current page if defaultPageSize changes
    const pastDefaultPageSize = useRef<number>(0)
    useEffect(() => {
        if (pastDefaultPageSize.current === defaultPageSize) {
            return
        }
        pastDefaultPageSize.current = defaultPageSize
        setCurrentPageAndPageSize(1, defaultPageSize)
    }, [defaultPageSize, setCurrentPageAndPageSize])

    return useMemo(() => ({
        pagination: {
            current,
            pageSize,
            total,
            onChange: setCurrentPageAndPageSize,
        },
        setTotal,
    }), [current, setCurrentPageAndPageSize, pageSize, total])
}

export function useTableColumns<ColumnID extends string, RowData extends AntdAnyObject>(
    setFilter: (searchKey: ColumnID, value: string) => void,
    filters: Partial<Record<ColumnID, string>>,
    columnDefinitions: ColumnDefinitions<ColumnID, RowData>,
    searchPropertyDefinitions: SearchPropertiesDefinitions<ColumnID>,
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
                    filters[columnID],
                    searchInput,
                    searchPropsArgs
                ))
            }
            columns.push(column)
        }
        return columns
    }, [columnDefinitions, filters, searchPropertyDefinitions, setFilter])
}

function getColumnSearchProps<SearchKey extends string, T = AntdAnyObject>(
    setFilter: (searchKey: SearchKey, value: string) => void,
    searchKey: SearchKey,
    currentFilterValue: string | undefined,
    searchInput: React.RefObject<InputRef>,
    searchPropsArgs: SearchPropertyDefinition,
): ColumnType<T> {
    return {
        filterDropdown: ({ confirm, close }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={`Search ${searchPropsArgs.placeholder ?? searchKey}`}
                    value={currentFilterValue ?? ''}
                    onChange={(e) => {
                        setFilter(searchKey, e.target.value)
                        confirm({ closeDropdown: false })
                    }}
                    onPressEnter={() => {
                        confirm()
                    }}
                    onKeyDown={(ev) => {
                        if (ev.key === 'Escape') {
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
        filterIcon: () => (
            <SearchOutlined style={{ color: currentFilterValue ? '#1677ff' : undefined }} />
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

export function useSmartSelection<RowData extends AntdAnyObject>(totalCount: number, itemsOnPage: RowData[], rowKey: RowKey<RowData>, initialExceptedItems?: React.Key[]) {
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


    const totalSelectionCount = defaultSelection ? totalCount - exceptedItems.length : exceptedItems.length

    return useMemo(() => ([
        rowSelection,
        {
            resetSelection,
            defaultSelection,
            exceptedItems,
            totalSelectionCount,
        }
    ] as const), [defaultSelection, exceptedItems, resetSelection, rowSelection, totalSelectionCount])
}

export function createQueryParamsFromFilters<ColumnID extends string>(filterKeys: FilterKeys<ColumnID>, descriptions: FilterDescriptions<ColumnID>, filters: Partial<Record<ColumnID, string>>): Record<string, string> {
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


type FetchRowData<ColumnID extends string, RowData extends AntdAnyObject> = (pageNumber: number, pageSize: number, filters: Partial<Record<ColumnID, string>>) => Promise<{ total: number, data: RowData[] }>

export function newFilterDefinitionsToFilterSet<ColumnID extends string>(filters: Partial<Record<ColumnID, string>>, filterDescriptions: FilterDescriptions<ColumnID>, filterKeys: FilterKeys<ColumnID>, searchProperties: SearchPropertiesDefinitions<ColumnID>): OldFilterSet {
    const filterSet: OldFilterSet = {}

    for (const columnID in filters) {
        const newValue = filters[columnID as ColumnID]
        const newFilterDescription = filterDescriptions[columnID as ColumnID]
        const newFilterKey = filterKeys[columnID as ColumnID]
        const newFilterSearchProps = searchProperties[columnID as ColumnID]

        if (newFilterDescription.type === FILTER_TYPE.INPUT) {
            filterSet[newFilterKey] = {
                value: newValue as OldFilterValue,
                description: {
                    type: FILTER_TYPE.INPUT,
                    key: newFilterKey,
                    label: newFilterSearchProps.placeholder ?? columnID,
                } as OldFilterDescription
            }
        }
    }

    return filterSet
}