import { ColumnsType, ColumnType, TableProps } from "antd/es/table"
import { AnyObject as AntdAnyObject } from "antd/es/_util/type"
import React, { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Checkbox, InputRef, Spin } from "antd"
import { SelectionSelectFn, TablePaginationConfig, TableRowSelection } from "antd/es/table/interface"
import { FILTER_TYPE } from "../constants"
import { FilterSet as OldFilterSet, FilterDescription as OldFilterDescription, FilterValue as OldFilterValue, MetadataFilterValue, FilterOptions } from "../models/paged_items"
import { ABORT_ERROR_NAME, QueryParams } from "./api"
import { addFiltersToColumns } from "../components/pagedItemsTable/MergeColumnsAndFilters"
import produce from "immer"
import { paramsForFilterKeyAndSetting } from "../components/pagedItemsTable/serializeFilterParamsTS"

export function usePaginatedDataProps<ColumnID extends string, RowData extends AntdAnyObject>({
    defaultPageSize,
    fetchRowData,
    bodySpinStyle,
    pagination = true,
}: UseTableDataAndLoadingArguments<ColumnID, RowData>): [
    Required<Pick<TableProps<RowData>, 'dataSource' | 'loading'>> & Pick<TableProps<RowData>, 'pagination' | 'locale'>,
    {
        fetchRowData: (args: Partial<FetchRowDataArguments<ColumnID>>, debounceTime?: number) => void,
        totalCount: number,
    }
] {
    const [dataSource, setDataSource] = useState<RowData[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    const [paginatedProps, { setPagination, setOnChange }] = usePaginationProps(defaultPageSize)

    const timeoutHandler = useRef<ReturnType<typeof setTimeout>>()
    useEffect(() => {
        return () => {
            clearTimeout(timeoutHandler.current)
        }
    }, [])

    // useRefs to keep track of the latest values between calls
    // and help reduce the number of dependencies for calling wrappedFetchRowData
    const oldPageNumber = useRef<number>(1)
    const oldPageSize = useRef<number>(defaultPageSize)
    const oldFilters = useRef<Filters<ColumnID>>()
    const oldSortBy = useRef<Partial<Record<ColumnID, 'ascend' | 'descend'>>>()
    const oldTotal = useRef<number>(0)
    const wrappedFetchRowData = useCallback(({
        pageNumber = oldPageNumber.current,
        pageSize = oldPageSize.current,
        filters = oldFilters.current,
        sortBy = oldSortBy.current
    }: Partial<FetchRowDataArguments<ColumnID>>,
        debounceTime?: number
    ) => {
        oldPageNumber.current = pageNumber
        oldPageSize.current = pageSize
        oldFilters.current = filters
        oldSortBy.current = sortBy

        if (bodySpinStyle) {
            // If using bodySpinStyle, we want to show the spinner in the body immediately
            // since the user will be able to use the filters and sorters while data is loading
            setLoading(true)
        }

        clearTimeout(timeoutHandler.current)
        timeoutHandler.current = setTimeout(async () => {
            setPagination(pageNumber, pageSize, oldTotal.current)
            setLoading(true)
            try {
                const { total: newTotal, data } = await fetchRowData({
                    pageNumber, pageSize, filters: filters ?? {}, sortBy: sortBy ?? {}
                })
                setDataSource(data)
                oldTotal.current = newTotal
                setPagination(pageNumber, pageSize, newTotal)
                setLoading(false)
                return data
            } catch (e) {
                console.error('Error fetching data for table:', e)
                if (e.name !== ABORT_ERROR_NAME) {
                    setLoading(false)
                }
            }
        }, debounceTime ?? 0)
    }, [bodySpinStyle, fetchRowData, setPagination])

    useEffect(() => {
        setOnChange((newPageNumber, newPageSize) => {
            wrappedFetchRowData({ pageNumber: newPageNumber, pageSize: newPageSize })
        })
    }, [setOnChange, wrappedFetchRowData])

    return [
        {
            dataSource: loading && bodySpinStyle ? [] : dataSource,
            loading: loading && !bodySpinStyle,
            ...(loading && bodySpinStyle ? { locale: { emptyText: <Spin style={bodySpinStyle} size={"large"} /> } } : undefined),
            ...(pagination ? paginatedProps : { pagination: false }),
        },
        {
            fetchRowData: wrappedFetchRowData,
            totalCount: paginatedProps.pagination.total ?? 0,
        }
    ]
}

export function usePaginationProps(defaultPageSize: number): [
    { pagination: TablePaginationConfig },
    {
        setPagination: (newCurrentPage: number, newPageSize: number, totalCount: number) => void,
        setOnChange: (newOnChange: NonNullable<TablePaginationConfig['onChange']>) => void,
    }
 ] {
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(defaultPageSize)
    const [totalCount, setTotalCount] = useState<number>(0)

    const [onChange, _setOnChange] = useState<NonNullable<TablePaginationConfig['onChange']>>(() => (pageNumber: number, pageSize: number) => {
        setPageNumber(pageNumber)
        setPageSize(pageSize)
    })
    const setOnChange = useCallback<(newOnChange: NonNullable<TablePaginationConfig['onChange']>) => void>((newOnChange) => {
        _setOnChange(() => newOnChange)
    }, [])

    const oldPageSize = useRef<number>(pageSize)
    const setPagination = useCallback((newPageNumber: number, newPageSize: number, newTotalCount: number) => {
        if ((newPageNumber - 1) * newPageSize >= newTotalCount) {
            newPageNumber = newPageSize > 0 ? Math.max(Math.ceil(newTotalCount / newPageSize), 1) : 1
        }
        if (newPageSize !== oldPageSize.current) {
            newPageNumber = 1
        }

        setPageNumber(newPageNumber)
        setPageSize(newPageSize)
        oldPageSize.current = newPageSize
        setTotalCount(newTotalCount)
    }, [])

    // Reset page size and current page if defaultPageSize changes
    const pastDefaultPageSize = useRef<number>(0)
    useEffect(() => {
        if (pastDefaultPageSize.current === defaultPageSize) {
            return
        }
        pastDefaultPageSize.current = defaultPageSize
        setPageNumber(1)
        setPageSize(defaultPageSize)
    }, [defaultPageSize])

    return [
        {
            pagination: {
                current: pageNumber,
                pageSize,
                total: totalCount,
                onChange,
            }
        },
        {
            setPagination,
            setOnChange, // expose setOnChange to allow updating onChange handler especially in usePaginatedDataProps
        }
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
            newSortBy = sorter.reduce<typeof sortBy>((newSortBy, sortItem) => {
                if (sortItem.order && sortItem.columnKey) {
                    newSortBy[sortItem.columnKey as ColumnID] = sortItem.order
                }
                return newSortBy
            }, {})
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
    setFilterDescriptions,
    filters,
    filterDescriptions,
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
            const filterDescription = filterDescriptions[columnID]
            if (searchPropsArgs && filterDescription) {
                Object.assign(column, getColumnSearchProps(
                    setFilters,
                    columnID,
                    filters[columnID],
                    searchInput,
                    searchPropsArgs,
                    filterDescription,
                    setFilterDescriptions,
                ))
            }

            column.sortOrder = sortBy[columnID] ?? null

            columns.push(column)
        }
        return { columns }
    }, [columnDefinitions, filterDescriptions, filters, searchPropertyDefinitions, setFilterDescriptions, setFilters, sortBy])
}

function getColumnSearchProps<SearchKey extends string, T extends AntdAnyObject>(
    setFilters: UseTableColumnsPropsArguments<SearchKey, T>['setFilters'],
    searchKey: SearchKey,
    currentFilterValue: FilterValue | undefined,
    searchInput: React.RefObject<InputRef>,
    searchPropsArgs: SearchPropertyDefinition,
    filterDescription: FilterDescription,
    setFilterDescriptions?: UseTableColumnsPropsArguments<SearchKey, T>['setFilterDescriptions'],
): ColumnDefinition<T> {
    const [{
        filterDropdown,
        filterIcon,
    }] = addFiltersToColumns(
        [{ columnID: searchKey, sorter: false }],
        { [searchKey]: newFilterDefinitionToOldFilterDescription(searchKey as string, filterDescription, searchPropsArgs) },
        { [searchKey]: searchKey as string },
        newFilterDefinitionsToFilterSet(searchKey, currentFilterValue, filterDescription, searchPropsArgs),
        (filterKey: string, value: FilterValue, description: OldFilterDescription) => {
            setFilters((prevFilters) => ({
                ...prevFilters,
                [searchKey]: value,
            }))
        },
        (filterKey: string, propertyName: string, value: boolean, description: OldFilterDescription) => {
            setFilterDescriptions?.((prevDescriptions) => produce(prevDescriptions, (draft) => {
                const desc = draft[searchKey as keyof typeof draft] as FilterDescription
                if (desc.type === FILTER_TYPE.INPUT || desc.type === FILTER_TYPE.INPUT_NUMBER) {
                    desc[propertyName as 'startsWith' | 'exactMatch'] = value
                }
            }))
        },
        undefined, // addSorter
        0, // debounceDelay
    )
    return {
        filterIcon,
        filterDropdown,
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

export function createQueryParamsFromFilters<ColumnID extends string>(filterKeys: FilterKeys<ColumnID>, descriptions: FilterDescriptions<ColumnID>, filters: Filters<ColumnID>): NonNullable<QueryParams> {
    return Object.entries(filters).reduce((acc, [key, value]) => {
        if (!value) {
            return acc
        }

        const filterKey = filterKeys[key as ColumnID]
        if (!filterKey) {
            console.error(`No filter key for filter column ID ${key}`)
            return acc
        }

        const description = descriptions[key as ColumnID]

        if (!description) {
            console.error(`No filter description for filter key ${key}`)
            return acc
        }

        let filterOptions: FilterOptions | undefined = undefined
        if (description.type === FILTER_TYPE.INPUT || description.type === FILTER_TYPE.INPUT_NUMBER) {
            filterOptions = {
                startsWith: description.startsWith,
                exactMatch: description.exactMatch,
            }
        }
        const params = paramsForFilterKeyAndSetting(
            filterKey,
            value,
            newFilterDefinitionToOldFilterDescription(
                key,
                description,
                {}
            ),
            filterOptions
        )
        return { ...acc, ...params }
    }, {} as NonNullable<QueryParams>)
}

export function createQueryParamsFromSortBy<ColumnID extends string>(sortKeys: SortKeys<ColumnID>, sortBy: SortBy<ColumnID>): Record<string, string> {
    const entries = Object.entries(sortBy)
    if (entries.length === 0) {
        return {}
    }
    return  {
        ordering: entries.map(([columnID, order]) => {
            return order === 'ascend' ? sortKeys[columnID as ColumnID] : `-${sortKeys[columnID as ColumnID]}`
        }).join(',')
    }
}

export function newFilterDefinitionToOldFilterDescription(columnKey: string, filterDescription: FilterDescription, searchPropertyDefinition: SearchPropertyDefinition): OldFilterDescription {
    switch (filterDescription.type) {
        case FILTER_TYPE.INPUT:
        case FILTER_TYPE.INPUT_NUMBER: 
        case FILTER_TYPE.INPUT_OBJECT_ID: {
            return {
                type: filterDescription.type,
                key: columnKey,
                label: searchPropertyDefinition?.placeholder ?? columnKey,
            }
        }
        case FILTER_TYPE.SELECT: {
            return {
                type: FILTER_TYPE.SELECT,
                key: columnKey,
                label: searchPropertyDefinition?.placeholder ?? columnKey,
                options: filterDescription.options,
            }
        }
        case FILTER_TYPE.DATE_RANGE: {
            return {
                type: FILTER_TYPE.DATE_RANGE,
                key: columnKey,
                label: searchPropertyDefinition?.placeholder ?? columnKey,
            }
        }
    }
    throw new Error(`Cannot convert filter description of type ${filterDescription.type} to old filter description`)
}

export function newFilterDefinitionsToFilterSet(columnID: string, filterValue: FilterValue, filterDescription: FilterDescription, searchPropertyDefinition?: SearchPropertyDefinition): OldFilterSet {
    // Normally the keys of OldFilterSet are filter keys (Django keys), but here we are using column ID

    switch (filterDescription.type) {
        case FILTER_TYPE.INPUT:
        case FILTER_TYPE.INPUT_NUMBER: {
            return {
                [columnID]: {
                    value: filterValue as OldFilterValue,
                    description: searchPropertyDefinition && newFilterDefinitionToOldFilterDescription(columnID, filterDescription, searchPropertyDefinition),
                    options: {
                        startsWith: filterDescription.startsWith,
                        exactMatch: filterDescription.exactMatch,
                    }
                }
            }
        }
        default: {
            return {
                [columnID]: {
                    value: filterValue as OldFilterValue,
                    description: newFilterDefinitionToOldFilterDescription(columnID, filterDescription, searchPropertyDefinition ?? {}),
                }
            }
        } 
    }
}

interface FetchRowDataArguments<ColumnID extends string> {
    pageNumber: number,
    pageSize: number,
    filters: Filters<ColumnID>,
    sortBy: Partial<Record<ColumnID, 'ascend' | 'descend'>>,
}
export type FetchRowData<ColumnID extends string, RowData extends AntdAnyObject> = (args: FetchRowDataArguments<ColumnID>) => Promise<{ total: number, data: RowData[] }>

export type ColumnDefinition<RowData extends AntdAnyObject> = ColumnType<RowData>
export type ColumnDefinitions<ColumnID extends string, RowData extends AntdAnyObject> = Partial<Record<ColumnID, ColumnDefinition<RowData>>>

export type FilterKeys<ColumnID extends string> = Partial<Record<ColumnID, string>>

export type FilterDescription =
    { type: keyof Pick<typeof FILTER_TYPE, 'INPUT' | 'INPUT_NUMBER' >, startsWith: boolean, exactMatch: boolean }
    | { type: keyof Pick<typeof FILTER_TYPE, 'INPUT_OBJECT_ID'> } // only __in lookup
    | { type: keyof Pick<typeof FILTER_TYPE, 'SELECT'>, options: Array<{ value: string, label: string }> }
    | { type: keyof Pick<typeof FILTER_TYPE, 'DATE_RANGE'> }
export type FilterDescriptions<ColumnID extends string> = Partial<Record<ColumnID, FilterDescription>>

export interface SearchPropertyDefinition { placeholder?: string }
export type SearchPropertiesDefinitions<ColumnID extends string> = Partial<Record<ColumnID, SearchPropertyDefinition>>

export type RowKey<RowData extends AntdAnyObject> = NonNullable<TableProps<RowData>['rowKey']>
function getKey<RowData extends AntdAnyObject>(rowKey: RowKey<RowData>, record: RowData): React.Key {
    return rowKey instanceof Function ? rowKey(record) : record[rowKey as keyof RowData] as React.Key
}

export type FilterValue = string | number | boolean | { min?: string | number, max?: string | number } | string[] | number[] | MetadataFilterValue | undefined
export type Filters<ColumnID extends string> = Partial<Record<ColumnID, FilterValue>>

export type SortBy<ColumnID extends string> = Partial<Record<ColumnID, 'ascend' | 'descend'>>
export type SortKeys<ColumnID extends string> = Partial<Record<ColumnID, string>>

interface UseTableDataAndLoadingArguments<ColumnID extends string, RowData extends AntdAnyObject> {
    defaultPageSize: number,
    fetchRowData: FetchRowData<ColumnID, RowData>,
    bodySpinStyle?: NonNullable<React.CSSProperties>,
    pagination?: boolean,
}

interface UseTableColumnsPropsArguments<ColumnID extends string, RowData extends AntdAnyObject> {
    filters: Filters<ColumnID>,
    setFilters: (newFilters: SetStateAction<Filters<ColumnID>>) => void,
    setFilterDescriptions?: (newDescriptions: SetStateAction<FilterDescriptions<ColumnID>>) => void,
    filterDescriptions: FilterDescriptions<ColumnID>,
    columnDefinitions: ColumnDefinitions<ColumnID, RowData>,
    searchPropertyDefinitions: SearchPropertiesDefinitions<ColumnID>,
    sortBy: SortBy<ColumnID>,
}
