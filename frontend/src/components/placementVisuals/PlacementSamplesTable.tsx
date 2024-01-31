import React, { useEffect, useState } from "react"
import { Table } from "antd";
import { TableRowSelection } from "antd/lib/table/interface";
interface PlacementSamplesTableProps {
    samples: any,
    onSampleSelect: (sampleRowKeys, type) => void,
    selectedSamples: any
}
const columns = [
    {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
    },
    {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
    },
    {
        title: 'coordinates',
        dataIndex: 'coordinates',
        key: 'coordinates',
    },
];
//component used to display and select samples in a table format for plate visualization placement
const PlacementSamplesTable = ({ samples, onSampleSelect, selectedSamples }: PlacementSamplesTableProps) => {
    const [sortedSamples, setSortedSamples] = useState<any>([])
    useEffect(() => {
        const reverse = selectedSamples.reverse()
        samples.sort((a, b) => {
            return reverse.indexOf(b.id) - reverse.indexOf(a.id);
        })
        setSortedSamples(samples)
    }, [samples, selectedSamples])

    const selectionProps: TableRowSelection<any> = {
        selectedRowKeys: selectedSamples,
        onChange: onSampleSelect,
    }

    return (
        <Table
            dataSource={sortedSamples}
            columns={columns}
            rowKey={obj => obj.id}
            rowSelection={selectionProps}
        />
    )
}
export default PlacementSamplesTable