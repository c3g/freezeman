import React, { useState, useEffect, useCallback } from "react"
import { Card, Typography, Form, Modal, FormItemProps, FormProps, Input, Tooltip, Space, Flex } from 'antd'
import { LeftCircleOutlined, PlusCircleOutlined, RightCircleOutlined } from "@ant-design/icons"
import { FMSArchivedComment } from "../../models/fms_api_models"
import dateToString from "../../utils/dateToString"
import renderTextWithLineBreaks from "../../utils/renderTextWithLineBreaks"
import { useAppSelector } from "../../hooks"
import { selectUsersByID } from "../../selectors"

const { Text } = Typography

interface CommentBoxProps {
    comments?: FMSArchivedComment[]
    handleAddComment: (comment: string) => void
}

export default function ArchivedCommentsBox({ comments, handleAddComment }: CommentBoxProps) {
    const [commentIndex, setCommentIndex] = useState<number>(0)
    const [currentComment, setCurrentComment] = useState<FMSArchivedComment>()
    const [openAddCommentForm, setOpenAddCommentForm] = useState<boolean>(false)
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    const [form] = Form.useForm()

    const handleNextComment = () => {
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
        const fieldValues = form.getFieldsValue()
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

    const resetFormData = useCallback(() => {
        const fieldValues = form.getFieldsValue()
        Object.keys(fieldValues).forEach((field) => {
            form.setFieldValue(field, undefined)
        })
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
            resetFormData()
        }
    }, [handleAddComment, resetFormData, returnFormData])

    const handleAddCommentForm = () => {
        setOpenAddCommentForm(true)
    }

    const onCancel = useCallback(() => {
        setOpenAddCommentForm(false)
        resetFormData()
    }, [resetFormData])

    const addCommentForm = (
        <Modal title={"Add Comment"} open={openAddCommentForm} okText={"Add"} onOk={form.submit} onCancel={onCancel} width={'60vw'}>
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
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 20 }} />
                </Form.Item>
            </Form>
        </Modal>
    )

    useEffect(() => {
        if (comments && comments.length > 0) {
            setCurrentComment(comments[comments.length - 1])
            setCommentIndex(0)
        }
        else {
          setCurrentComment(undefined)
        }
    }, [comments])

    useEffect(() => {
        if (comments && comments.length > 0) {
            setCurrentComment(comments[comments.length - commentIndex - 1])
        }
    }, [commentIndex, comments])


    const usersByID = useAppSelector(selectUsersByID)

    return (
        <Card
            style={{ width: "100%", height: "100%", minHeight: "100%", boxSizing: "border-box" }}
            styles={{ body: {height: "480px", padding: "5px", overflow: "auto"}}}

            actions={[
                <Tooltip title="Previous Comment"><LeftCircleOutlined style={{ fontSize: "24px" }} key="previous" onClick={handlePreviousComment} /></Tooltip>,
                <Tooltip title="Add Comment"><PlusCircleOutlined style={{ fontSize: "24px" }} key="add" onClick={handleAddCommentForm} />{addCommentForm}</Tooltip>,
                <Tooltip title="Next Comment"><RightCircleOutlined style={{ fontSize: "24px" }} key="next" onClick={handleNextComment} /></Tooltip>,
            ]}
        >
            <Card.Meta
                title={
                    <div>
                        {currentComment &&
                            <Flex justify={"space-between"}>
                                <Space direction={"horizontal"}>
                                    <Text strong>Added at:</Text>
                                    {dateToString(new Date(currentComment.updated_at), "compact")}
                                </Space>
                                <Space direction={"horizontal"}>
                                    <Text strong>By:</Text>
                                    {usersByID[currentComment.created_by]?.username}
                                </Space>
                            </Flex>
                        }
                    </div>}
                description={currentComment ? renderTextWithLineBreaks(currentComment.comment) : ""}
            />
        </Card>
    )
}