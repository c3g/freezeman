import React from "react"
import { Row, Col, Timeline, Empty } from "antd"
import { FMSArchivedComment } from "../../models/fms_api_models"
import useTimeline from "../../utils/useTimeline"
import dayjs from "dayjs"
import renderTextWithLineBreaks from "../../utils/renderTextWithLineBreaks"
import { useAppSelector } from "../../hooks"
import { selectUsersByID } from "../../selectors"
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
            <Timeline mode={"left"} style={{marginLeft: timelineMarginLeft}}>
              {orderedComments.map(comment => 
                <Timeline.Item key={comment.id} label={`${(dayjs(comment.created_at).format("YYYY-MM-DD HH:mm"))} (${usersByID[comment.created_by]?.username})`}>
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