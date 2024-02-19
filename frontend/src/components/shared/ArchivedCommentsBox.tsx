import React, { useState, useEffect } from "react"
import { Card, Typography, Form, Modal } from 'antd'
import { LeftCircleOutlined, PlusCircleOutlined, RightCircleOutlined } from "@ant-design/icons"
import { FMSArchivedComment } from "../../models/fms_api_models"
import dateToString from "../../utils/dateToString"

const { Text } = Typography

interface CommentBoxProps {
  comments?: FMSArchivedComment[]
  handleAddComment: Function
}

// const [form] = Form.useForm()

export default function ArchivedCommentsBox({ comments, handleAddComment }: CommentBoxProps) {
  const [commentIndex, setCommentIndex] = useState<number>(0)
  const [currentComment, setCurrentComment] = useState<FMSArchivedComment>()
  const [orderedComments, setorderedComments] = useState<FMSArchivedComment[]>([])
  const [openAddCommentForm, setOpenAddCommentForm] = useState<boolean>(false)
  
  const handleNextDataset = () => {
    if (commentIndex > 0) {
      setCommentIndex(commentIndex - 1)
    }
  }
  
  const handlePreviousComment = () => {
    if (comments && commentIndex < (comments?.length - 1)) {
      setCommentIndex(commentIndex + 1)
    }
  }
  
  /*const onFinish: NonNullable<FormProps['onFinish']> = useCallback(() => {
    const additionalData = returnFormData()
    if (additionalData) {
      handleExecuteAutomation(additionalData)
      setOpenAdditionalDataForm(false)
    }
  }, [handleExecuteAutomation, returnFormData])
*/

  const addCommentForm = () => {
   /* <Modal title={"Add Comment"} open={openAddCommentForm} okText={"Add"} onOk={form.submit} onCancel={() => setOpenAddCommentForm(false)} width={'30vw'}>
        <Typography.Paragraph>
            Enter your comment :
        </Typography.Paragraph>
        <Form
            form={form}
            onFinish={onFinish}
            layout="horizontal"
        >
          {
            Object.keys(formatedData).sort().map((field) => {
              return (
                <Form.Item
                    key="comment"
                    label={<Typography.Text style={{ marginLeft: '1rem', width: `${maxLabelWidth*0.6}em`, textAlign: 'left' }}>Comment: </Typography.Text>}
                    colon={false}
                    {...itemValidation(field)}
                >
                  <Input type="text"/>
                </Form.Item>
              )
            })
          }
        </Form>
      </Modal>*/
  }

  useEffect(() => {
    comments && comments.length > 0 && setorderedComments([...comments.sort((a, b) => b.id - a.id)])
  }, [comments])

  useEffect(() => {
    orderedComments && orderedComments.length > 0 && setCurrentComment(orderedComments[commentIndex])
  }, [orderedComments, commentIndex])


	return (
      <Card
        style={{ width: "100%", height: "100%", minHeight: "100%", boxSizing: "border-box" }}
        bodyStyle={{height: "85%", padding: '5px'}}
        
        actions={[
          <LeftCircleOutlined key="previous" disabled={!comments || commentIndex<=0} onClick={handlePreviousComment}/>,
          <PlusCircleOutlined key="add" onClick={addCommentForm} />,
          <RightCircleOutlined key="next" disabled={!comments || commentIndex>=(comments?.length - 1)} onClick={handleNextDataset}/>,
        ]}
      >
        <Card.Meta
          title={
            <div>
              {currentComment && <Text strong>Added on : </Text>}{currentComment && dateToString(new Date(currentComment.updated_at), "compact")}
            </div>}
          description={currentComment && currentComment.comment}
        />
      </Card>
      
	)
}