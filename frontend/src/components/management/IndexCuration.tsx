import React, { useEffect, useMemo, useState } from "react"
import { FMSPooledSample } from "../../models/fms_api_models"
import { Table, TableProps } from "antd"
import { useAppDispatch } from "../../hooks"
import api from "../../utils/api"

export function IndexCuration() {
  const [pooledSamples, setPooledSamples] = useState<FMSPooledSample[]>([])
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(api.pooledSamples.list({ include_pools_of_one: true, derived_sample__library__isnull: false, limit: 100 })).then((response) => {
      setPooledSamples(response.data.results)
    })
  }, [dispatch])

  const columns = useMemo<TableProps<FMSPooledSample>['columns']>(() => [
    {
      title: 'Name',
      dataIndex: 'alias',
      key: 'alias',
    },
    {
      title: 'Container Barcode',
      dataIndex: 'container_barcode',
      key: 'container_barcode',
    },
    {
      title: 'Coordinates',
      dataIndex: 'coordinates',
      key: 'coordinates',
    },
    {
      title: 'Current Index',
      dataIndex: 'index',
      key: 'index',
    },
  ], [])

    return (
      <>
        <Table<FMSPooledSample>
          dataSource={pooledSamples}
          rowKey="id"
          columns={columns}
        />
      </>
    )
}