import { ExpandableConfig } from "antd/lib/table/interface"
import { ObjectWithReadset } from "./ReadsetsTableColumns"
import { ReactNode, useMemo } from "react"
import { TableProps, Tooltip } from "antd"
import { MinusCircleTwoTone, PlusCircleTwoTone } from "@ant-design/icons"
import { Readset } from "../../models/frontend_models"
import React from "react"

export const ReadsetMetricContent = () => {
    const columnTitle: ReactNode = <div>View Metrics</div>
    function checkIfDecimal(str: string) {
      const num = parseFloat(str)
      if (String(num).includes('.')) {
          return num.toFixed(3)
      } else {
          return num
      }
    }
    return ({
        columnTitle: columnTitle,
        expandIcon: ({ expanded, onExpand, record }) =>
            expanded ? (
                <Tooltip title="Hide Metrics">
                    <MinusCircleTwoTone style={{fontSize: 18}} onClick={e => onExpand(record, e)} />
                </Tooltip>
            ) : (
                <Tooltip title="View Metrics">
                    <PlusCircleTwoTone style={{fontSize: 18}} onClick={e => onExpand(record, e)} />
                </Tooltip>

            )
        ,
        expandedRowRender: (record) => {
            const readset: Readset = record.readset
            return (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8,1fr)',
                    gap: '1em'
                }} key={readset.id}>
                    {
                        readset.metrics ?
                            Object.keys(readset.metrics).map(
                                (name) => {
                                    return (
                                        readset.metrics && (readset.metrics[name].value_numeric || readset.metrics[name].value_string) &&


                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                        }} key={name}>
                                            {<b >
                                                {name.replace(/_/g, " ")}
                                            </b>
                                            }
                                            {readset.metrics[name].value_numeric
                                                ?
                                                checkIfDecimal(readset.metrics[name].value_numeric)
                                                :
                                                readset.metrics[name].value_string}
                                        </div>)
                                })
                            :
                            <div>No metrics</div>
                    }
                </div>
            )
        }
    }
  )
}