import React, { useState, useCallback } from "react"
import { Card, Typography, Form, Modal, FormItemProps, FormProps, Input, Tooltip, Space, Flex } from 'antd'
import { PlusCircleOutlined } from "@ant-design/icons"
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
    const [openAddCommentForm, setOpenAddCommentForm] = useState<boolean>(false)
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    const [form] = Form.useForm()

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


    const usersByID = useAppSelector(selectUsersByID)

    return (
        <Card
            style={{ width: "100%", height: "100%", minHeight: "100%", boxSizing: "border-box" }}
            styles={{ body: {height: "480px", padding: "5px", overflow: "auto"}}}

            actions={[
                <Tooltip title="Add Comment"><PlusCircleOutlined style={{ fontSize: "24px" }} key="add" onClick={handleAddCommentForm} />{addCommentForm}</Tooltip>,
            ]}
        >
            {(comments ?? []).sort((a, b) => b.id - a.id).map((comment) => {
                return <div key={comment.id}>
                    <Flex justify={"space-between"}>
                        <Space direction={"horizontal"}>
                                <Text strong>Added at:</Text>
                                {dateToString(new Date(comment.updated_at), "compact")}
                        </Space>
                        <Space direction={"horizontal"}>
                                <Text strong>By:</Text>
                                {usersByID[comment.created_by]?.username}
                        </Space>
                    </Flex>
                    {renderTextWithLineBreaks(comment.comment)}
                </div>
            })}
        </Card>
    )
}