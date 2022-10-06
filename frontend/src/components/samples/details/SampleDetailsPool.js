import React, { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import getFilterProps from "../../filters/getFilterProps";
import getNFilters from "../../filters/getNFilters";
import FiltersWarning from "../../filters/FiltersWarning";
import { POOLED_SAMPLES_FILTERS } from "../../filters/descriptions";
import PaginatedList from '../../shared/PaginatedList'
import {clearFilters, flushState, listTable, setFilter, setFilterOption, setPoolId, setSortBy} from '../../../modules/pooledSamples/actions'
import usePaginatedList from '../../../hooks/usePaginatedList'
import { Button, Tag } from 'antd'
import { Link } from 'react-router-dom'


const getTableColumns = (sampleKinds) => {
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
                    // TODO: https://206.12.92.46/issues/1295 (create separate parent sample column)
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
            title: "Kind",
            dataIndex: "sample_kind",
            sorter: true,
            options: sampleKinds.items.map(x => ({ label: x.name, value: x.name })), // for getFilterProps
            render: (_, sample) =>
                <Tag>{sample.sample_kind ? sample.sample_kind : "POOL"}</Tag>,
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
        {
            title: "Individual",
            dataIndex: "individual_name",
            sorter: true,
            render: (_, pooledSample) => 
            {
                return pooledSample.individual_id ?
                    <Link to={`/individuals/${pooledSample.individual_id}`}>{pooledSample.individual_name}</Link>
                    : 
                    <div>{pooledSample.individual_name}</div>
            }
                
        },
        {
            title: "Collection Site",
            dataIndex: "collection_site",
            sorter: true
        },
        {
            title: "Experimental Groups",
            dataIndex: "experimental_groups",
            sorter: false,
            render: (_, pooledSample) => {
                return pooledSample.experimental_groups && pooledSample.experimental_groups.length > 0 &&
                    <>
                        { pooledSample.experimental_groups.map( groupName => <div key={groupName}>{groupName}</div>) }
                    </>
            }
        }
    ].map((column) => ({ ...column, key: column.title }))
}


const SampleDetailsPool = ({sample}) => {
    // Only display the pooled samples table if the sample is actually a pool.
    // Otherwise, just display a message saying that there are no pooled samples to display.
    return (
        sample.is_pool ?
            <PooledSamples sample={sample}/>
        :
            <NoPooledSamples/>
    )
}

export const NoPooledSamples = () => {
    return (
        <div>This is not a pooled sample.</div>
    )
}

const PooledSamples = ({sample: pool}) => {

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
    const sampleKinds = useSelector((state) => state.sampleKinds)
    const totalCount = useSelector((state) => state.pooledSamples.totalCount)
    const isFetching = useSelector((state) => state.pooledSamples.isFetching)
    const filters = useSelector((state) => state.pooledSamples.filters)
    const sortBy = useSelector((state) => state.pooledSamples.sortBy)

    let columns = getTableColumns(sampleKinds)
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