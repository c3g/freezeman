import React, { ReactNode, useMemo } from "react"
import { TableProps, Timeline, Tooltip } from "antd"
import { CommentOutlined, MinusCircleTwoTone, PlusCircleTwoTone } from "@ant-design/icons";
import { ObjectWithDataset } from "./DatasetsTableColumns";
import { Dataset } from "../../models/frontend_models";
import { useAppSelector } from "../../hooks";
import { selectUsersByID } from "../../selectors";

import * as humanReadableTime from "../../utils/humanReadableTime";
import renderTextWithLineBreaks from "../../utils/renderTextWithLineBreaks"

export default function useExpandableTableDatasetComments() {
    const usersByID = useAppSelector(selectUsersByID)
    const columnTitleIcon: ReactNode = <Tooltip title="Validation Comments">
        <CommentOutlined />
    </Tooltip>
    const expandable: NonNullable<TableProps<ObjectWithDataset | Dataset>['expandable']> = (
        {
            expandedRowClassName: 'fms-ant-table-expanded-row',
            columnTitle: columnTitleIcon,
            expandIcon: ({ expanded, onExpand, record }) =>
                expanded ? (
                    <Tooltip title="Hide Comments">
                        <MinusCircleTwoTone style={{ fontSize: 18 }} onClick={e => onExpand(record, e)} />
                    </Tooltip>
                ) : (
                    <Tooltip title="View Comments">
                        <PlusCircleTwoTone style={{ fontSize: 18 }} onClick={e => onExpand(record, e)} />
                    </Tooltip>

                ),
            expandedRowRender: (record) => {
                /* The dataset could be nested or not as a record */
                const comments = record && ('dataset' in record ? record.dataset.archived_comments : record.archived_comments) || []
                const orderedComments = [...comments].sort((a, b) => a.id - b.id).reverse()
                
                const items  = orderedComments.map(comment => ({
                    key: comment.id,
                    label: `${humanReadableTime.full(new Date(comment.created_at))} (${usersByID[comment.created_by]?.username})`,
                    children: renderTextWithLineBreaks(comment.comment, true)
                }))
                return <Timeline items={items} mode="left" />
            }
        }
    )
    return expandable
}