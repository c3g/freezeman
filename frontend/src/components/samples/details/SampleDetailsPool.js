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
import {flushState, listTable, setFilter, setFilterOption, setPoolId, setSortBy} from '../../../modules/pooledSamples/actions'
import usePaginatedList from '../../../hooks/usePaginatedList'

const { Title } = Typography;



/* Sample data returned.
{
    "id": 392696,
    "volume_ratio": "0.500",
    "derived_sample": {
        "id": 392696,
        "library": {
            "id": 6,
            "library_type": "PCR-free",
            "platform": "ILLUMINA",
            "index": {
                "id": 13133,
                "index_set": "IDT_10nt_UDI_TruSeq_Adapter",
                "index_structure": "TruSeqHT",
                "name": "IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_002",
                "sequences_3prime": [
                    7094
                ],
                "sequences_5prime": [
                    7093
                ]
            },
            "library_size": "100",
            "strandedness": "Double stranded"
        },
        "biosample": {
            "id": 296342,
            "alias": null,
            "collection_site": "MUHC",
            "individual": 189385
        },
        "tissue_source": {
            "name": "BLOOD",
            "is_extracted": false
        },
        "sample_kind": {
            "name": "DNA",
            "is_extracted": true
        },
        "experimental_group": []
    },
}
*/

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
    const flushStateCallback = useCallback(() => {
        dispatch(flushState())
    })

    useEffect(() => {
        setPoolIdCallback(pool.id)
        return flushStateCallback()
    }, [pool])

    // We have to force the initial page load
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
        <Title level={4}>Pooled Samples</Title>
        <PaginatedList {...paginatedListProps}/>
    </>
    )
}

export default SampleDetailsPool