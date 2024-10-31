import React, { ReactNode } from "react"
import { TableProps, Tooltip } from "antd"
import { CommentOutlined, MinusCircleTwoTone, PlusCircleTwoTone } from "@ant-design/icons";
import ArchivedCommentsTimeline from "../shared/ArchivedCommentsTimeline"
import { ObjectWithDataset } from "./DatasetsTableColumns";
import { Dataset } from "../../models/frontend_models";


export default function ExpandableTableDatasetComments(): NonNullable<TableProps<any>['expandable']> {

  const columnTitleIcon: ReactNode = <Tooltip title="Validation Comments">
              <CommentOutlined />
            </Tooltip>
  return (
    {
      columnTitle: columnTitleIcon,
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
      expandedRowRender: (record: ObjectWithDataset | Dataset | undefined) => {
        /* The dataset could be nested or not as a record */
        const comments = record && ('dataset' in record ? record.dataset.archived_comments : record.archived_comments) || []
        return (<ArchivedCommentsTimeline comments={comments}/>)
      }
    }
  )
}