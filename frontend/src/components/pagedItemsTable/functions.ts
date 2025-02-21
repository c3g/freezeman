import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sample } from "../../models/frontend_models";
import { FilterValue, FilterDescription } from "../../models/paged_items";
import { list as listSamples } from "../../modules/samples/actions";
import { AppDispatch } from "../../store";
import { PagedItemsActionsCallbacks } from './PagedItemsTable'


export function fetchSamplesByDefaultSelectionAndExceptedIDs(defaultSelection: boolean, exceptedSampleIDs: Array<Sample['id']>, options: any) {
    return async (dispatch: AppDispatch) => {
        if (defaultSelection) {
            const response = await dispatch(listSamples({ ...options, id__not__in: exceptedSampleIDs.join(',') }))
            return response.results
        } else {
            const response = await dispatch(listSamples({ ...options, id__in: exceptedSampleIDs.join(',') }))
            return response.results
        }
    }
}

export function useQueryParamsForPagedItems(
    columnFilters: Record<string, FilterDescription>,
    filterKeys: Record<string, string>,
    setFilter: (value: FilterValue, description: FilterDescription) => Promise<void>,
    clearFilters: () => Promise<void>
): Pick<PagedItemsActionsCallbacks, 'setFilterCallback' | 'clearFiltersCallback'> {
        const [searchParams, setSearchParams] = useSearchParams()

        const setFilterCallback: PagedItemsActionsCallbacks['setFilterCallback']  = useCallback((value, description) => {
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
                    value as unknown as FilterValue,
                    {
                        ...columnFilters[columnID],
                        key: filterKey
                    }
                )
            }
        }, [columnFilters, filterKeys, searchParams, setFilter])

        return { setFilterCallback, clearFiltersCallback }
}