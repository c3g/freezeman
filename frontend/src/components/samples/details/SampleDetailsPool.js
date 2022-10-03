import React, { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import getFilterProps from "../../filters/getFilterProps";
import getNFilters from "../../filters/getNFilters";
import FiltersWarning from "../../filters/FiltersWarning";
import { POOLED_SAMPLES_FILTERS } from "../../filters/descriptions";
import PaginatedList from '../../shared/PaginatedList'
import {clearFilters, flushState, listTable, setFilter, setFilterOption, setPoolId, setSortBy} from '../../../modules/pooledSamples/actions'
import usePaginatedList from '../../../hooks/usePaginatedList'
import { Button } from 'antd'
import { Link } from 'react-router-dom'


const getTableColumns = () => {
    return [
        {    
            title: "Project",
            dataIndex: "project_name",   
            sorter: true,
            render: (_, pooledSample) => {
                return (pooledSample.project_id && pooledSample.project_name) &&
                    <Link to={`/projects/${pooledSample.project_id}`}>{pooledSample.project_name}</Link>
            }               
        },
        {
            title: "Alias",
            dataIndex: "alias",
            sorter: true,
            render: (_, pooledSample) => {
                return (
                    // The link points to the parent sample of the pooled derived sample, eg. the library
                    // that was pooled.
                    <Link to={`/samples/${pooledSample.parent_sample_id}`}>{pooledSample.alias}</Link>
                )
            }  
        },
        {
            title: "Volume Ratio",
            dataIndex: "volume_ratio",
            sorter: true,
        },
    
        {
            title: "Library Type",
            dataIndex: "library_type",
            sorter: true
        },
        {
            title: "Library Size",
            dataIndex: "library_size",
            sorter: true
        },
        {
            title: "Index",
            dataIndex: "index",
            sorter: true,
            render: (_, pooledSample) => {
                return pooledSample.index && 
                <Link to={`/indices/${pooledSample.index_id}`}>{pooledSample.index}</Link>
            }
        },
    ].map((column) => ({ ...column, key: column.title }))
}


const SampleDetailsPool = ({sample: pool}) => {

    const dispatch = useDispatch()
    
    const setPoolIdCallback = useCallback(() => {
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

    const filterKey = POOLED_SAMPLES_FILTERS.sample__id.key

    const nFilters = getNFilters(filters)

    const paginatedListProps = usePaginatedList({
        columns,
        items: samples,
        itemsByID: samplesById,
        rowKey: 'id',
        loading: isFetching,
        totalCount: totalCount,
        filters,
        filterKey,
        sortBy,
        onLoad: dispatchListTable,
        onChangeSort: setSortByCallback
    })

    return (
    <>
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
    </>
    )
}

export default SampleDetailsPool