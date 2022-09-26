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
import {createListFilterForPool, setFilter, setFilterOption, setSortBy} from '../../../modules/pooledSamples/actions'
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

// Converts a dotted path to an array of string required by the Ant Table class.
const dataIndex = (s) => s.split('.')
 
const DATA_INDEX = {
    volume_ratio:       dataIndex('volume_ratio'),
    library_type:       dataIndex('derived_sample.library.library_type'),
    library_platform:   dataIndex('derived_sample.library.platform'),
    index_structure:    dataIndex('derived_sample.library.index_structure'),
    index_set:          dataIndex('derived_sample.library.index.index_set'),
    index_name:         dataIndex('derived_sample.library.index.name'),
    alias:              dataIndex('derived_sample.biosample.alias'),
    tissue_source_name: dataIndex('derived_sample.biosample.name'),
    sample_kind:        dataIndex('derived_sample.sample_kind.name')
}


const getTableColumns = () => {
    return [
        {
            title: "Alias",
            dataIndex: DATA_INDEX.alias,
            sorter: true
        },
        {
            title: "Volume Ratio",
            dataIndex: DATA_INDEX.volume_ratio,
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
            dataIndex: DATA_INDEX.index_set,
            sorter: true
        },
        {
            title: "Index",
            dataIndex: DATA_INDEX.index_name,
            sorter: true
        },
    ].map((column) => ({ ...column, key: column.title }))
}


const SampleDetailsPool = ({sample: pool}) => {

    const dispatch = useDispatch()
    const dispatchListFilter = useCallback((...args) => {
        // listFilter needs a pool_id query parameter, so we have to use a factory
        // function to create a closure that includes the pool_id, and pass that
        // to the filtered list component
        const listFilter = createListFilterForPool(pool.id)
        dispatch(listFilter(...args))
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

    // We have to force the initial page load
    useEffect(() => {
        dispatchListFilter({})
    }, [pool.id])
    
    const samples = useSelector((state) => state.pooledSamples.filteredItems)
    const samplesById = useSelector((state) => state.pooledSamples.itemsByID)
    const totalCount = useSelector((state) => state.pooledSamples.filteredItemsCount)
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
        onLoad: dispatchListFilter,
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