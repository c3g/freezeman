import { useCallback, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { FilterDescription, FilterValue } from "./paged_items"
import { PagedItemsActionsCallbacks } from "../components/pagedItemsTable/PagedItemsTable"

export function useQueryParams(
    columnFilters: Record<string, FilterDescription>,
    filterKeys: Record<string, string>,
    setFilter: (value: FilterValue, description: FilterDescription) => Promise<void>,
    clearFilters: () => Promise<void>
): Pick<PagedItemsActionsCallbacks, 'setFilterCallback' | 'clearFiltersCallback'> {
        const [searchParams, setSearchParams] = useSearchParams()

        const setFilterCallback: typeof setFilter = useCallback((value, description) => {
            const newSearchParams = new URLSearchParams(searchParams)
            const columnID = Object.entries(columnFilters).find(([_, v]) => v.label === description.label)?.[0] as string
            newSearchParams.set(filterKeys[columnID], value?.toString() ?? '')
            setSearchParams(newSearchParams)
            return Promise.resolve()
        }, [columnFilters, filterKeys, searchParams, setSearchParams])

        const clearFiltersCallback = useCallback(() => {
            setSearchParams('')
            clearFilters()
            return Promise.resolve()
        }, [clearFilters, setSearchParams])

        useEffect(() => {
            for (const [filterKey, value] of searchParams.entries()) {
                const columnID = Object.entries(filterKeys).find(([_, v]) => v === filterKey)?.[0] as string
                setFilter(
                    value,
                    {
                        ...columnFilters[columnID],
                        key: filterKey
                    }
                )
            }
        }, [columnFilters, filterKeys, searchParams, setFilter])

        return { setFilterCallback, clearFiltersCallback }
}