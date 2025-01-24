import React from "react"
import { Row, Col, Timeline, Empty, Typography } from "antd"
import { FMSArchivedComment } from "../../models/fms_api_models"
import dateToString from "../../utils/dateToString"
import useTimeline from "../../utils/useTimeline"
import renderTextWithLineBreaks from "../../utils/renderTextWithLineBreaks"

const { Paragraph } = Typography
interface commentsTimelineProps {
  comments: FMSArchivedComment[]
}

export default function ArchivedCommentsTimeline({ comments } : commentsTimelineProps) {
  const [timelineMarginLeft, timelineRef] = useTimeline();
  const compareComments = (a, b) => a.id - b.id
  const orderedComments = [...comments].sort(compareComments).reverse()

	return (
    <Row justify="center">
      <Col span={orderedComments.length > 0 ? 24 : 1}>
        <div ref={timelineRef} style={{ paddingTop: "1rem" }}>
          {comments.length > 0 ?
            <Timeline mode={"left"} style={{ marginLeft: timelineMarginLeft}}>
              {orderedComments.map(comment => 
                <Timeline.Item key={comment.id} label={dateToString(new Date(comment.created_at), "full")}>
                  {renderTextWithLineBreaks(comment.comment, true)}
                </Timeline.Item>)}
            </Timeline>
            : Empty.PRESENTED_IMAGE_SIMPLE
          }
        </div>
      </Col>
    </Row>
  )
}