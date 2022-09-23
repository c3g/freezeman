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
import {createListFilterForPool} from '../../../modules/pooledSamples/actions'
import useFilteredList from '../../../hooks/useFilteredList'

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

const indexPath = (s) => s.split('.')
 
const DATA_INDEX = {
    volume_ratio:       indexPath('volume_ratio'),
    library_type:       indexPath('derived_sample.library.library_type'),
    library_platform:   indexPath('derived_sample.library.platform'),
    index_structure:    indexPath('derived_sample.library.index_structure'),
    index_set:          indexPath('derived_sample.library.index.index_set'),
    index_name:         indexPath('derived_sample.library.index.name'),
    alias:              indexPath('derived_sample.biosample.alias'),
    tissue_source_name: indexPath('derived_sample.biosample.name'),
    sample_kind:        indexPath('derived_sample.sample_kind.name')
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

    
    const samples = useSelector((state) => state.pooledSamples.filteredItems)
    const samplesById = useSelector((state) => state.pooledSamples.itemsByID)
    const totalCount = useSelector((state) => state.pooledSamples.filteredItemsCount)
    const isFetching = useSelector((state) => state.pooledSamples.isFetching)
    const page = useSelector((state) => state.pooledSamples.page)

    const columns = getTableColumns()

    const filterKey = POOLED_SAMPLES_FILTERS.alias.key

    const paginatedListProps = useFilteredList({
        description: POOLED_SAMPLES_FILTERS,
        columns: columns,
        listFilter: dispatchListFilter,
        items: samples,
        itemsByID: samplesById,
        totalCount: totalCount,
        filterID: pool.id,
        filterKey: filterKey,
        rowKey: 'id',
        isFetching: isFetching,
        page: page
    })

    return (
    <>
        <Title level={4}>Pooled Samples</Title>
        <PaginatedList {...paginatedListProps}/>
    </>
    )
}

export default SampleDetailsPool