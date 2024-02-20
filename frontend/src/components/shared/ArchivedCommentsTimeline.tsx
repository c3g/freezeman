import React from "react"
import { Row, Col, Timeline, Empty } from "antd"
import { Dataset } from "../../models/frontend_models"
import { FMSArchivedComment } from "../../models/fms_api_models"
import dateToString from "../../utils/dateToString"
import useTimeline from "../../utils/useTimeline";

interface commentsTimelineProps {
  record: {
    dataset: Dataset
  }
}

export default function ArchivedCommentsTimeline({ record } : commentsTimelineProps) {
  const comments: FMSArchivedComment[] = record && record.dataset.archived_comments
  const [timelineMarginLeft, timelineRef] = useTimeline();

	return (
    <Row justify="center">
      <Col span={comments.length > 0 ? 24 : 1}>
        <div ref={timelineRef}>
          {comments.length > 0 ?
            <Timeline mode={"left"} style={{ marginLeft: timelineMarginLeft }}>
              {comments.map(comment => <Timeline.Item key={comment.id} label={dateToString(new Date(comment.created_at), "full")}>{comment.comment}</Timeline.Item>)}
            </Timeline>
            : Empty.PRESENTED_IMAGE_SIMPLE
          }
        </div>
      </Col>
    </Row>
  )
}