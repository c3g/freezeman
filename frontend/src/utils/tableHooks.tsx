import { ColumnsType, ColumnType, TableProps } from "antd/es/table"
import { AnyObject as AntdAnyObject } from "antd/es/_util/type"
import React, { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Checkbox, Input, InputRef, Spin } from "antd"
import { SelectionSelectFn, TablePaginationConfig, TableRowSelection } from "antd/es/table/interface"
import { FILTER_TYPE } from "../constants"
import { SearchOutlined } from "@ant-design/icons"
import { FilterSet as OldFilterSet, FilterDescription as OldFilterDescription, FilterValue as OldFilterValue } from "../models/paged_items"
import { ABORT_ERROR_NAME } from "./api"

export function useTableDataAndLoadingProps<ColumnID extends string, RowData extends AntdAnyObject>({
    fetchRowData,
    bodySpinStyle,
}: UseTableDataAndLoadingArguments<ColumnID, RowData>): [
    Required<Pick<TableProps<RowData>, 'dataSource' | 'loading' | 'locale'>>,
    {
        fetchRowData: (args: Partial<FetchRowDataArguments<ColumnID>>) => Promise<RowData[]>,
        total: number,
    }
] {
    const [total, setTotal] = useState<number>(0)
    const [dataSource, setDataSource] = useState<RowData[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    const oldPageNumber = useRef<number>()
    const oldPageSize = useRef<number>()
    const oldFilters = useRef<Filters<ColumnID>>()
    const oldSortBy = useRef<Partial<Record<ColumnID, 'ascend' | 'descend'>>>()
    const wrappedFetchRowData = useCallback(async ({
        pageNumber = oldPageNumber.current, pageSize = oldPageSize.current, filters = oldFilters.current, sortBy = oldSortBy.current
    }: Partial<FetchRowDataArguments<ColumnID>>) => {
        oldPageNumber.current = pageNumber
        oldPageSize.current = pageSize
        oldFilters.current = filters
        oldSortBy.current = sortBy

        if (pageNumber !== undefined && pageSize !== undefined) {
            setLoading(true)
            try {
                const { total: newTotal, data } = await fetchRowData({
                    pageNumber, pageSize, filters: filters ?? {}, sortBy: sortBy ?? {}
                })
                setDataSource(data)
                setTotal?.(newTotal)
                setLoading(false)
                return data
            } catch (e) {
                console.error('Error fetching data for table:', e)
                if (e.name !== ABORT_ERROR_NAME) {
                    setLoading(false)
                }
            }
        }
        return []
    }, [fetchRowData, setTotal])

    return [
        {
            dataSource: loading && bodySpinStyle ? [] : dataSource,
            loading: loading && !bodySpinStyle,
            locale: loading && bodySpinStyle ? { emptyText: <Spin style={bodySpinStyle} size={"large"} /> } : {},
        },
        {
            fetchRowData: wrappedFetchRowData,
            total,
        }
    ]
}

export function usePaginationProps(defaultPageSize: number, total: number, onPaginationChange?: (pageNumber: number, pageSize: number) => void): [
    { pagination: TablePaginationConfig },
 ] {
    const [current, setCurrent] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(defaultPageSize)

    const oldPageNumber = useRef<number>(defaultPageSize)
    const oldPageSize = useRef<number>(defaultPageSize)

    const setCurrentPageAndPageSize = useCallback((newCurrentPage?: number, newPageSize?: number) => {
        newCurrentPage = newCurrentPage ?? current
        newPageSize = newPageSize ?? pageSize
        if ((newCurrentPage - 1) * newPageSize >= total) {
            newCurrentPage = newPageSize > 0 ? Math.max(Math.ceil(total / newPageSize), 1) : 1
        }
        if (newPageSize !== pageSize) {
            newCurrentPage = 1
        }

        // Avoid calling onPaginationChange if pagination did not change.
        // This can happen because Antd Table calls onChange for filter and sort changes too.
        if (oldPageNumber.current === newCurrentPage && oldPageSize.current === newPageSize) {
            // No change
            return
        } else {
            oldPageNumber.current = newCurrentPage
            oldPageSize.current = newPageSize
        }

        setCurrent(newCurrentPage)
        setPageSize(newPageSize)
        onPaginationChange?.(newCurrentPage, newPageSize)
    }, [current, onPaginationChange, pageSize, total])

    // Reset page size and current page if defaultPageSize changes
    const pastDefaultPageSize = useRef<number>(0)
    useEffect(() => {
        if (pastDefaultPageSize.current === defaultPageSize) {
            return
        }
        pastDefaultPageSize.current = defaultPageSize
        setCurrentPageAndPageSize(1, defaultPageSize)
    }, [defaultPageSize, setCurrentPageAndPageSize])

    return [
        {
            pagination: {
                current,
                pageSize,
                total,
                onChange: setCurrentPageAndPageSize,
            }
        },
    ]
}

export function useTableSortByProps<ColumnID extends string, RowData extends AntdAnyObject>(onSortChange?: (sortBy: SortBy<ColumnID>) => void): [
    Required<Pick<TableProps<RowData>, 'onChange'>>,
    {
        sortBy: SortBy<ColumnID>,
        setSortBy: React.Dispatch<React.SetStateAction<SortBy<ColumnID>>>,
    }
] {
    const [sortBy, setSortBy] = useState<SortBy<ColumnID>>({})

    const onChange = useCallback<NonNullable<TableProps<RowData>['onChange']>>((pagination, filters, sorter) => {
        let newSortBy: SortBy<ColumnID> = {}
        if (Array.isArray(sorter)) {
            setSortBy((sortBy) => {
                newSortBy = sorter.reduce<typeof sortBy>((newSortBy, sortItem) => {
                    if (sortItem.order && sortItem.columnKey) {
                        newSortBy[sortItem.columnKey as ColumnID] = sortItem.order
                    }
                    return newSortBy
                }, {})
                return newSortBy
            })
        } else {
            if (sorter.order && sorter.columnKey) {
                newSortBy = { [sorter.columnKey as ColumnID]: sorter.order } as SortBy<ColumnID>
            } else {
                newSortBy = {}
            }
        }

        // Don't trigger onSortChange if sortBy did not change
        // This can happen because Antd Table calls onChange for filter and pagination changes too.
        const combineKeys = new Set([...Object.keys(sortBy), ...Object.keys(newSortBy)])
        const sortByChanged = [...combineKeys].some((key) => sortBy[key as ColumnID] !== newSortBy[key as ColumnID])
        if (sortByChanged) {
            onSortChange?.(newSortBy)
        }

        setSortBy(newSortBy)
    }, [onSortChange, sortBy])

    return [
        { onChange },
        {
            sortBy,
            setSortBy,
        }
    ] as const
}

export function useTableColumnsProps<ColumnID extends string, RowData extends AntdAnyObject>({
    setFilters,
    filters,
    columnDefinitions,
    searchPropertyDefinitions,
    sortBy,
}: UseTableColumnsPropsArguments<ColumnID, RowData>): Required<Pick<TableProps<RowData>, 'columns'>> {
    const searchInput = useRef<InputRef>(null)
    return useMemo(() => {
        const columns: ColumnsType<RowData> = []
        for (const columnID in columnDefinitions) {
            const column: ColumnType<RowData> = {}
            Object.assign(column, columnDefinitions[columnID])

            const searchPropsArgs = searchPropertyDefinitions[columnID]
            if (searchPropsArgs) {
                Object.assign(column, getColumnSearchProps(
                    setFilters,
                    columnID,
                    filters[columnID],
                    searchInput,
                    searchPropsArgs
                ))
            }

            column.sortOrder = sortBy[columnID] ?? null

            columns.push(column)
        }
        return { columns }
    }, [columnDefinitions, filters, searchPropertyDefinitions, setFilters, sortBy])
}

function getColumnSearchProps<SearchKey extends string, T extends AntdAnyObject>(
    setFilters: UseTableColumnsPropsArguments<SearchKey, T>['setFilters'],
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
                        setFilters((prevFilters => ({
                            ...prevFilters,
                            [searchKey]: e.target.value,
                        })))
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
                        setFilters({})
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

export function useFilters<ColumnID extends string>(defaultFilters: Filters<ColumnID>, onChange: (filters: Filters<ColumnID>) => void) {
    const [filters, setFilters] = useState<Filters<ColumnID>>(defaultFilters)

    const mySetFilters = useCallback<typeof setFilters>((newFilters) => {
        if (typeof newFilters === 'function') {
            setFilters((prevFilters) => {
                const updatedFilters = newFilters(prevFilters)
                onChange(updatedFilters)
                return updatedFilters
            })
        } else {
            onChange(newFilters)
            setFilters(newFilters)
        }
    }, [onChange])

    return [filters, mySetFilters] as const
}

interface UseSmartSelectionPropsArguments<RowData extends AntdAnyObject> {
    totalCount: number,
    itemsOnPage: readonly RowData[],
    rowKey: RowKey<RowData>,
    initialExceptedItems?: React.Key[],
}
export function useSmartSelectionProps<RowData extends AntdAnyObject>({
    totalCount,
    itemsOnPage,
    rowKey,
    initialExceptedItems,
}: UseSmartSelectionPropsArguments<RowData>): [
    Required<Pick<TableProps<RowData>, 'rowSelection'>>,
    {
        resetSelection: () => void,
        defaultSelection: boolean,
        exceptedItems: React.Key[],
        totalSelectionCount: number,
    }
] {
	const [defaultSelection, setDefaultSelection] = useState(false)
	const [exceptedItems, setExceptedItems] = useState<React.Key[]>([])
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
    
    const indeterminate = !allIsSelected && !noneIsSelected
    const rowSelection: TableRowSelection<RowData> = {
        type: 'checkbox',
        selectedRowKeys,
        onChange: useCallback<NonNullable<TableRowSelection<RowData>['onChange']>>((selectedRowKeys, selectedRows, info) => {
            if (info.type === 'all') {
                onSelectAll()
            }
            if (info.type === 'multiple') {
                // shift is held
                onSelectMultiple(selectedRowKeys)
            }
        }, [onSelectAll, onSelectMultiple]),
        onSelect: onSelectSingle,
        columnTitle: (
            <Checkbox
                checked={!noneIsSelected}
                indeterminate={indeterminate}
                onChange={onSelectAll}
            />
        )
    }

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
    // to avoid confusion when items are no longer filtered in
    const resetSelection = useCallback(() => {
        setDefaultSelectionAndExceptedItems(false, [])
    }, [setDefaultSelectionAndExceptedItems])


    const totalSelectionCount = defaultSelection ? totalCount - exceptedItems.length : exceptedItems.length

    return [
        { rowSelection },
        {
            resetSelection,
            defaultSelection,
            exceptedItems,
            totalSelectionCount,
        }
    ]
}

export function createQueryParamsFromFilters<ColumnID extends string>(filterKeys: FilterKeys<ColumnID>, descriptions: FilterDescriptions<ColumnID>, filters: Filters<ColumnID>): Record<string, string> {
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

export function createQueryParamsFromSortBy<ColumnID extends string>(sortKeys: SortKeys<ColumnID>, sortBy: SortBy<ColumnID>): Record<string, string> {
    return  {
        ordering: Object.entries(sortBy).map(([columnID, order]) => {
            return order === 'ascend' ? sortKeys[columnID as ColumnID] : `-${sortKeys[columnID as ColumnID]}`
        }).join(',')
    }
}

export function newFilterDefinitionsToFilterSet<ColumnID extends string>(filters: Filters<ColumnID>, filterDescriptions: FilterDescriptions<ColumnID>, filterKeys: FilterKeys<ColumnID>, searchProperties: SearchPropertiesDefinitions<ColumnID>): OldFilterSet {
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

interface FetchRowDataArguments<ColumnID extends string> {
    pageNumber: number,
    pageSize: number,
    filters: Filters<ColumnID>,
    sortBy: Partial<Record<ColumnID, 'ascend' | 'descend'>>,
}
export type FetchRowData<ColumnID extends string, RowData extends AntdAnyObject> = (args: FetchRowDataArguments<ColumnID>) => Promise<{ total: number, data: RowData[] }>

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

export type Filters<ColumnID extends string> = Partial<Record<ColumnID, string>>

export type SortBy<ColumnID extends string> = Partial<Record<ColumnID, 'ascend' | 'descend'>>
export type SortKeys<ColumnID extends string> = Record<ColumnID, string>

interface UseTableDataAndLoadingArguments<ColumnID extends string, RowData extends AntdAnyObject> {
    fetchRowData: FetchRowData<ColumnID, RowData>,
    bodySpinStyle?: NonNullable<React.CSSProperties>,
}

interface UseTableColumnsPropsArguments<ColumnID extends string, RowData extends AntdAnyObject> {
    setFilters: (newFilters: SetStateAction<Filters<ColumnID>>) => void,
    filters: Filters<ColumnID>,
    columnDefinitions: ColumnDefinitions<ColumnID, RowData>,
    searchPropertyDefinitions: SearchPropertiesDefinitions<ColumnID>,
    sortBy: SortBy<ColumnID>,
}
