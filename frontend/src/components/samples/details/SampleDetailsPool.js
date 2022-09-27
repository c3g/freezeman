import React, { useCallback, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {FILTER_TYPE} from "../../../constants";
import getFilterProps from "../../filters/getFilterProps";
import getNFilters from "../../filters/getNFilters";
import FiltersWarning from "../../filters/FiltersWarning";
import { POOLED_SAMPLES_FILTERS } from "../../filters/descriptions";
import { Typography } from "antd";
import FilteredList from '../../FilteredList';
import PaginatedList from '../../shared/PaginatedList'
import {clearFilters, flushState, listTable, setFilter, setFilterOption, setPoolId, setSortBy} from '../../../modules/pooledSamples/actions'
import usePaginatedList from '../../../hooks/usePaginatedList'
import AppPageHeader from '../../AppPageHeader'
import PageContent from '../../PageContent'
import { Button } from 'antd'

const { Title } = Typography;


const getTableColumns = () => {
    return [
        {
            title: "Alias",
            dataIndex: "alias",
            sorter: true
        },
        {
            title: "Volume Ratio",
            dataIndex: "volume_ratio",
            sorter: true,
        },
        // TODO: 
        // {    
        //     title: "Project",
        //     dataIndex: "project",   
        //     sorter: true,
        // },
        {
            title: "Index Set",
            dataIndex: "index_set",
            sorter: true
        },
        {
            title: "Index",
            dataIndex: "index",
            sorter: true
        },
    ].map((column) => ({ ...column, key: column.title }))
}


const SampleDetailsPool = ({sample: pool}) => {

    const dispatch = useDispatch()
    
    const setPoolIdCallback = useCallback((...args) => {
        dispatch(setPoolId(pool.id))
    })
    const dispatchListTable = useCallback((...args) => {
        dispatch(listTable(...args))
    }, [dispatch, pool])

    const setFilterCallback = useCallback((...args) => {
        dispatch(setFilter(...args))
    })
    const setFilterOptionCallback = useCallback((...args) => {
        dispatch(setFilterOption(...args))
    })
    const setSortByCallback = useCallback((...args) => {
        dispatch(setSortBy(...args))
    })
    const clearFiltersCallback = useCallback((...args) => {
        dispatch(clearFilters(...args))
    })
    const flushStateCallback = useCallback(() => {
        dispatch(flushState())
    })

    useEffect(() => {
        // Set the id of the pool that is displayed by this component.
        // This must be called before any data is loaded.
        setPoolIdCallback(pool.id)
        // Return a cleanup function that is called when the component is destroyed.
        return flushStateCallback
    }, [pool])

    // Force the initial page load
    useEffect(() => {
        dispatchListTable({})
    }, [pool])
    
    const samples = useSelector((state) => state.pooledSamples.items)
    const samplesById = useSelector((state) => state.pooledSamples.itemsByID)
    const totalCount = useSelector((state) => state.pooledSamples.totalCount)
    const isFetching = useSelector((state) => state.pooledSamples.isFetching)
    const page = useSelector((state) => state.pooledSamples.page)
    const filters = useSelector((state) => state.pooledSamples.filters)
    const sortBy = useSelector((state) => state.pooledSamples.sortBy)

    let columns = getTableColumns()
    columns = columns.map(c => Object.assign(c, getFilterProps(
        c,
        POOLED_SAMPLES_FILTERS,
        filters,
        setFilterCallback,
        setFilterOptionCallback
    )))

    // TODO what is the filter key for?
    const filterKey = POOLED_SAMPLES_FILTERS.alias.key

    const nFilters = getNFilters(filters)

    const paginatedListProps = usePaginatedList({
        columns,
        items: samples,
        itemsByID: samplesById,
        rowKey: 'id',
        loading: isFetching,
        totalCount: totalCount,
        page,
        filters,
        filterKey,
        sortBy,
        onLoad: dispatchListTable,
        onChangeSort: setSortByCallback
    })

    return (
    <>
        <PageContent>
        <div style={{ textAlign: 'right', marginBottom: '1em' }}>
            <FiltersWarning
                nFilters={nFilters}
                filters={filters}
                description={POOLED_SAMPLES_FILTERS}
            />
            <Button
                style={{ margin: 6 }}
                disabled={nFilters === 0}
                onClick={clearFiltersCallback}
            >
                Clear Filters
            </Button>
        </div>
            <PaginatedList {...paginatedListProps}/>
        </PageContent>
        
    </>
    )
}

export default SampleDetailsPool