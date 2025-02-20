import React from "react"
import { Row, Col, Timeline, Empty, Typography } from "antd"
import { FMSArchivedComment } from "../../models/fms_api_models"
import dateToString from "../../utils/dateToString"
import useTimeline from "../../utils/useTimeline"
import renderTextWithLineBreaks from "../../utils/renderTextWithLineBreaks"
import { useAppSelector } from "../../hooks"
import { selectUsersByID } from "../../selectors"
import * as humanReadableTime from "../../utils/humanReadableTime";

const { Paragraph } = Typography
interface commentsTimelineProps {
  comments: FMSArchivedComment[]
}

export default function ArchivedCommentsTimeline({ comments } : commentsTimelineProps) {
  const [timelineMarginLeft, timelineRef] = useTimeline();
  const orderedComments = [...comments].sort((a, b) => a.id - b.id).reverse()
  const usersByID = useAppSelector(selectUsersByID)

	return (
    <Row justify="center">
      <Col span={orderedComments.length > 0 ? 24 : 1}>
        <div ref={timelineRef} style={{ paddingTop: "1rem" }}>
          {comments.length > 0 ?
            <Timeline mode={"left"} style={{ marginLeft: timelineMarginLeft}}>
              {orderedComments.map(comment => 
                <Timeline.Item key={comment.id} label={`${humanReadableTime.full(new Date(comment.created_at))} (${usersByID[comment.created_by]?.username})`}>
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