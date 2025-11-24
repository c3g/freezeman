import { ColumnsType, ColumnType, TableProps } from "antd/es/table"
import { AnyObject as AntdAnyObject } from "antd/es/_util/type"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Checkbox, Input, InputRef, Spin } from "antd"
import { SelectionSelectFn, TablePaginationConfig, TableRowSelection } from "antd/es/table/interface"
import { FILTER_TYPE } from "../constants"
import { SearchOutlined } from "@ant-design/icons"
import { useDebouncedEffect } from "../components/filters/filterComponents/DebouncedInput"
import { FilterSet as OldFilterSet, FilterDescription as OldFilterDescription, FilterValue as OldFilterValue } from "../models/paged_items"
import { ABORT_ERROR_NAME } from "./api"

type FetchRowData<ColumnID extends string, RowData extends AntdAnyObject> = (pageNumber: number, pageSize: number, filters: Partial<Record<ColumnID, string>>, sortBy: SortBy<ColumnID>) => Promise<{ total: number, data: RowData[] }>

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

type SortBy<ColumnID extends string> = Partial<Record<ColumnID, 'ascend' | 'descend'>>
export type SortKeys<ColumnID extends string> = Record<ColumnID, string>

interface UsePaginatedDataPropsArguments<ColumnID extends string, RowData extends AntdAnyObject> {
    defaultPageSize: number,
    fetchRowData: FetchRowData<ColumnID, RowData>,
    filters: Partial<Record<ColumnID, string>>,
    sortBy: SortBy<ColumnID>,
    bodySpinStyle?: NonNullable<React.CSSProperties>,
}
export function usePaginatedDataProps<ColumnID extends string, RowData extends AntdAnyObject>({
    defaultPageSize,
    fetchRowData,
    filters,
    sortBy,
    bodySpinStyle,
}: UsePaginatedDataPropsArguments<ColumnID, RowData>): Required<Pick<TableProps<RowData>, 'dataSource' | 'loading' | 'locale'>> & { pagination: TablePaginationConfig }
{
    const { pagination, setTotal } = usePagination(defaultPageSize)
    
    const { current: currentPage, pageSize } = pagination
    
    const [dataSource, setDataSource] = useState<RowData[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const myFetchRowData = useCallback(() => {
        if (currentPage !== undefined && pageSize !== undefined) {
            setLoading(true)
            fetchRowData(
                currentPage, pageSize, filters, sortBy
            ).then(({ total: newTotal, data }) => {
                setDataSource(data)
                setTotal(newTotal)
                setLoading(false)
            }).catch((e) => {
                console.error('Error fetching data for table:', e)
                if (e.name !== ABORT_ERROR_NAME) {
                    setLoading(false)
                }
            })
        }
    }, [currentPage, pageSize, fetchRowData, filters, sortBy, setTotal])
    useDebouncedEffect(myFetchRowData)

    return {
        dataSource: loading && bodySpinStyle ? [] : dataSource,
        pagination,
        loading: loading && !bodySpinStyle,
        locale: loading && bodySpinStyle ? { emptyText: <Spin style={bodySpinStyle} size={"large"} /> } : {},
    }
}

function usePagination(defaultPageSize: number): {
    pagination: TablePaginationConfig,
    setTotal: (total: number) => void,
} {
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

    return {
        pagination: {
            current,
            pageSize,
            total,
            onChange: setCurrentPageAndPageSize,
        },
        setTotal,
    }
}

interface UseTableColumnsPropsArguments<ColumnID extends string, RowData extends AntdAnyObject> {
    setFilter: (searchKey: ColumnID, value: string) => void,
    filters: Partial<Record<ColumnID, string>>,
    columnDefinitions: ColumnDefinitions<ColumnID, RowData>,
    searchPropertyDefinitions: SearchPropertiesDefinitions<ColumnID>,
    sortBy: SortBy<ColumnID>,
}
export function useTableColumnsProps<ColumnID extends string, RowData extends AntdAnyObject>({
    setFilter,
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
                    setFilter,
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
    }, [columnDefinitions, filters, searchPropertyDefinitions, setFilter, sortBy])
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

export function useTableSortByProps<ColumnID extends string, RowData extends AntdAnyObject>(): [
    Required<Pick<TableProps<RowData>, 'onChange'>>,
    {
        sortBy: SortBy<ColumnID>,
        setSortBy: React.Dispatch<React.SetStateAction<SortBy<ColumnID>>>,
    }
] {
    const [sortBy, setSortBy] = useState<SortBy<ColumnID>>({})

    const onChange = useCallback<NonNullable<TableProps<RowData>['onChange']>>((pagination, filters, sorter) => {
        if (Array.isArray(sorter)) {
            setSortBy((sortBy) => {
                return sorter.reduce<typeof sortBy>((newSortBy, sortItem) => {
                    if (sortItem.order && sortItem.columnKey) {
                        newSortBy[sortItem.columnKey as ColumnID] = sortItem.order
                    }
                    return newSortBy
                }, {})
            })
        } else {
            if (sorter.order && sorter.columnKey) {
                setSortBy({
                    [sorter.columnKey as ColumnID]: sorter.order
                } as SortBy<ColumnID>)
            } else {
                setSortBy({})
            }
        }
    }, [])

    return [
        { onChange },
        {
            sortBy,
            setSortBy,
        }
    ] as const
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

export function createQueryParamsFromSortBy<ColumnID extends string>(sortKeys: SortKeys<ColumnID>, sortBy: SortBy<ColumnID>): Record<string, string> {
    return  {
        ordering: Object.entries(sortBy).map(([columnID, order]) => {
            return order === 'ascend' ? sortKeys[columnID as ColumnID] : `-${sortKeys[columnID as ColumnID]}`
        }).join(',')
    }
}

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