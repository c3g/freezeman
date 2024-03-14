import React from "react"
import { TableProps, Tooltip } from "antd"
import { MinusCircleTwoTone, PlusCircleTwoTone } from "@ant-design/icons";
import ArchivedCommentsTimeline from "../shared/ArchivedCommentsTimeline"
import { ObjectWithDataset } from "./DatasetsTableColumns";


export default function ExpandableTableDatasetComments(): NonNullable<TableProps<any>['expandable']> {
  return (
    {
      columnTitle: <div>Comments</div>,
      expandIcon: ({ expanded, onExpand, record }) =>
          expanded ? (
            <Tooltip title="Hide Comments">
              <MinusCircleTwoTone style={{fontSize: 18}} onClick={e => onExpand(record, e)} />
            </Tooltip>
          ) : (
            <Tooltip title="View Comments">
              <PlusCircleTwoTone style={{fontSize: 18}} onClick={e => onExpand(record, e)} />
            </Tooltip>

          ),
      expandedRowRender: (record) => {
        /* The dataset could be nested or not as a record */
        const comments = record && (record.dataset ? record.dataset.archived_comments : record.archived_comments)
        return (<ArchivedCommentsTimeline comments={comments}/>)
      }
    }
  )
}
