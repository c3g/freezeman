import React, { useState, useEffect } from "react"
import { Button, Card, Row, Col } from 'antd'
import { LeftCircleOutlined, PlusCircleOutlined, RightCircleOutlined } from "@ant-design/icons"
import { FMSArchivedComment } from "../../models/fms_api_models"

interface CommentBoxProps {
  comments?: FMSArchivedComment[]
  handleAddComment: Function
}


export default function ArchivedCommentsBox({ comments, handleAddComment }: CommentBoxProps) {
  const [commentIndex, setCommentIndex] = useState<number>(0)
  const [currentComment, setCurrentComment] = useState<FMSArchivedComment>()

  const handlePreviousComment = () => {
    if (commentIndex > 0) {
      setCommentIndex(commentIndex - 1)
    }
  }
  
  const handleNextDataset = () => {
    if (comments && commentIndex < (comments?.length - 1)) {
      setCommentIndex(commentIndex + 1)
    }
  }
  
  useEffect(() => {
    comments && comments.length > 0 && setCurrentComment(comments[commentIndex])
  }, [comments, commentIndex])


	return (
      <Card
        style={{ width: "100%", height: "100%", minHeight: "100%", boxSizing: "border-box" }}
        //headStyle={{height: "20%", padding: '5px', backgroundColor: '#BBB'}}
        bodyStyle={{height: "85%", padding: '5px'}}
        
        actions={[
          <LeftCircleOutlined key="previous" disabled={!comments || commentIndex<=0} onClick={handlePreviousComment}/>,
          <PlusCircleOutlined key="add" />,
          <RightCircleOutlined key="next" disabled={!comments || commentIndex>=(comments?.length - 1)} onClick={handleNextDataset}/>,
        ]}
      >
        <Card.Meta
          title={currentComment && currentComment.updated_at}
          description={currentComment && currentComment.comment}
        />
      </Card>
	)
}