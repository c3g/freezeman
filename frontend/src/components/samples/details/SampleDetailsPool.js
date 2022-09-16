import React from 'react'
import PaginatedTable from '../../PaginatedTable';
import {FILTER_TYPE} from "../../../constants";
import getFilterProps from "../../filters/getFilterProps";
import getNFilters from "../../filters/getNFilters";
import FiltersWarning from "../../filters/FiltersWarning";
import { Typography } from "antd";

const { Title } = Typography;


const getTableColumns = () => {
    return [
        {
            title: "Alias",
            dataIndex: "alias",
            sorter: true,
        },
        {
            title: "Project",
            dataIndex: "project",   // TODO - do we have to use withProject?
            sorter: true,
        },
        {
            title: "Volume Ratio",
            dataIndex: "volume_ratio",
            sorter: false
        },
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

const getFilters = () => {
    return ({
        id: {
            type: FILTER_TYPE.INPUT,
            key: "alias",
            label: "Alias"
          },
          project: {
            type: FILTER_TYPE.INPUT,
            key: "project",
            label: "Project Name"
          },
          volume_ratio: {
            type: FILTER_TYPE.INPUT,
            key: "volume_ratio",
            label: "Volume Ratio"
          },
          index: {
            type: FILTER_TYPE.INPUT,
            key: "index",
            label: "Index"
          },
          index_set: {
            type: FILTER_TYPE.INPUT,
            key: "index_set",
            label: "Index Set"
          },
        })
}


const SampleDetailsPool = ({sample}) => {

    const pooled_samples = []

    const clearFilters = () => {}   // TODO

    return (
    <>
        <Title level={4}>Pooled Samples</Title>
        <div style={{ textAlign: 'right', marginBottom: '1em' }}>
            <FiltersWarning
                nFilters={nFilters}
                filters={filters}
                description={CONTAINER_FILTERS}
            />
            <Button
                style={{ margin: 6 }}
                disabled={nFilters === 0}
                onClick={clearFilters}
            >
            Clear Filters
            </Button>
        </div>
        <PaginatedTable
            columns={getTableColumns()}
            items={pooled_samples}      // TODO
            itemsByID={[]}              // TODO
            rowKey="alias"              // TODO
            loading={false}             // TODO
            totalCount={0}              // TODO
            page={1}                    // TODO
            filters={getFilters()}
            sortBy={undefined}          // TODO
            pageSize={20}               // TODO
            onLoad={() => {}}           // TODO
            onChangeSort={() => {}}     // TODO
        ></PaginatedTable>
    </>
    )
}

export default SampleDetailsPool