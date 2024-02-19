import React, { useState, useEffect, useCallback } from "react"
import { Card, Typography, Form, Modal, FormItemProps,  FormProps, Input } from 'antd'
import { LeftCircleOutlined, PlusCircleOutlined, RightCircleOutlined } from "@ant-design/icons"
import { FMSArchivedComment } from "../../models/fms_api_models"
import dateToString from "../../utils/dateToString"

const { Text } = Typography

interface CommentBoxProps {
  comments?: FMSArchivedComment[]
  handleAddComment: Function
}

export default function ArchivedCommentsBox({ comments, handleAddComment }: CommentBoxProps) {
  const [commentIndex, setCommentIndex] = useState<number>(0)
  const [currentComment, setCurrentComment] = useState<FMSArchivedComment>()
  const [openAddCommentForm, setOpenAddCommentForm] = useState<boolean>(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  
  const [form] = Form.useForm()

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
  
  const returnFormData = useCallback(() => {
    const fieldValues = form.getFieldsValue();
    const formData: Record<string, string> = {}
    const errorData = {}
    let error = false
    Object.keys(fieldValues).forEach((field) => {
      if (fieldValues[field] == undefined) {
          errorData[field] = 'Missing Field'
          error = true
      }
      else {
        formData[field] = fieldValues[field]    
      }
    })
    if (error) {
        setFormErrors(errorData)
        return null
    }
    return formData
  }, [form])

  const itemValidation = useCallback((key: string): FormItemProps => {
    if (formErrors && formErrors[key]) {
        return {
            help: formErrors[key],
            validateStatus: 'error',
            name: key
        }
    }
    return { name: key }
  }, [formErrors])

  const onFinish: NonNullable<FormProps['onFinish']> = useCallback(() => {
    const additionalData = returnFormData()
    if (additionalData) {
      handleAddComment(additionalData["comment"])
      setOpenAddCommentForm(false)
    }
  }, [handleAddComment, returnFormData])

  const handleAddCommentForm = () => {
    setOpenAddCommentForm(true)
  }

  const addCommentForm = (
    <Modal title={"Add Comment"} open={openAddCommentForm} okText={"Add"} onOk={form.submit} onCancel={() => setOpenAddCommentForm(false)} width={'60vw'}>
      <Form
          form={form}
          onFinish={onFinish}
          layout="horizontal"
      >
        <Form.Item
          key="comment"
          label={<Typography.Text style={{ marginLeft: '1rem', width: `5em`, textAlign: 'left' }}>Comment: </Typography.Text>}
          colon={false}
          {...itemValidation("comment")}
        >
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 20 }}/>
        </Form.Item>
      </Form>
    </Modal>
  )

  useEffect(() => {
    comments && comments.length > 0 && setCurrentComment(comments[comments.length - commentIndex - 1])
  }, [comments, commentIndex])

	return (
    <Card
      style={{ width: "100%", height: "100%", minHeight: "100%", boxSizing: "border-box" }}
      bodyStyle={{height: "85%", padding: '5px'}}
      
      actions={[
        <LeftCircleOutlined key="previous" disabled={!comments || commentIndex<=0} onClick={handlePreviousComment}/>,
        <><PlusCircleOutlined key="add" onClick={handleAddCommentForm} />{addCommentForm}</>,
        <RightCircleOutlined key="next" disabled={!comments || commentIndex>=(comments?.length - 1)} onClick={handleNextDataset}/>,
      ]}
    >
      <Card.Meta
        title={
          <div>
            {currentComment && <Text strong>Added at : </Text>}{currentComment && dateToString(new Date(currentComment.updated_at), "compact")}
          </div>}
        description={currentComment && currentComment.comment}
      />
    </Card>
	)
}