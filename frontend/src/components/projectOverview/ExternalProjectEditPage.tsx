import { Alert, Button, Form, Input, Space, message } from "antd"
import React, { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { emailRules, externalIdRules, requiredRules } from "../../constants"
import { useAppDispatch } from "../../hooks"
import { FMSParentProject } from "../../models/fms_api_models"
import api from "../../utils/api"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"

const MAX_LENGTH = 200
const maxLengthRule = { max: MAX_LENGTH, message: `Maximum ${MAX_LENGTH} characters` }

type FormValues = Pick<
  FMSParentProject,
  "external_id" | "name" | "principal_investigator" | "requestor_name" | "requestor_email"
>

const ExternalProjectEditPage = () => {
  const { parentProjectId } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [form] = Form.useForm<FormValues>()

  const [parentProject, setParentProject] = useState<FMSParentProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonFieldErrors, setNonFieldErrors] = useState<string[]>([])

  const detailsURL = `/external-projects-overview/${parentProjectId}`

  useEffect(() => {
    if (!parentProjectId || Number.isNaN(Number(parentProjectId))) {
      navigate("/external-projects-overview", { replace: true })
      return
    }

    let cancelled = false
    dispatch(api.parentProjects.get(Number(parentProjectId)))
      .then((response) => {
        if (cancelled) return
        setParentProject(response.data)
        form.setFieldsValue(response.data)
      })
      .catch(() => {
        if (!cancelled) setError("Unable to fetch the external project")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [parentProjectId, dispatch, form, navigate])

  const onFinish = async (values: FormValues) => {
    if (!parentProject) return

    setIsSubmitting(true)
    setNonFieldErrors([])
    try {
      await dispatch(api.parentProjects.update({ id: parentProject.id, ...values }))
      message.success("External project updated")
      navigate(detailsURL)
    } catch (err) {
      const data = (err as { data?: Record<string, unknown> } | undefined)?.data
      // Show backend validation errors (e.g. duplicate external_id) on the matching field.
      const { non_field_errors, ...fieldErrors } = data ?? {}
      setNonFieldErrors((non_field_errors as string[] | undefined) ?? [])
      form.setFields(
        Object.entries(fieldErrors).map(([name, errors]) => ({
          name: name as keyof FormValues,
          errors: Array.isArray(errors) ? errors.map(String) : [String(errors)],
        })),
      )
      if (!data) setError("Unable to update the external project")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AppPageHeader
        title={`Update External Project${parentProject ? ` ${parentProject.name}` : ""}`}
      />
      <PageContent loading={isLoading}>
        {error && <Alert type="error" title={error} style={{ marginBottom: 16 }} />}
        <Form
          form={form}
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          layout="horizontal"
          onFinish={onFinish}
          disabled={!parentProject}
        >
          <Form.Item
            label="External ID"
            name="external_id"
            rules={[...requiredRules, ...externalIdRules, maxLengthRule]}
            tooltip="Format: P000000."
            extra="External identifier for the project (Hercules project number)."
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Name"
            name="name"
            rules={[...requiredRules, maxLengthRule]}
            extra="Full external name of the project (Hercules name)."
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Principal Investigator"
            name="principal_investigator"
            rules={[maxLengthRule]}
            extra="Full name of the principal investigator."
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Requestor Name"
            name="requestor_name"
            rules={[maxLengthRule]}
            extra="Full name of the contact person that made the project request."
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Requestor Email"
            name="requestor_email"
            rules={[...emailRules, maxLengthRule]}
            extra="Email of the contact for the project."
          >
            <Input />
          </Form.Item>
          {nonFieldErrors.length > 0 && (
            <Alert
              showIcon
              type="error"
              style={{ marginBottom: "1em" }}
              title="Validation error(s)"
              description={
                <ul>
                  {nonFieldErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              }
            />
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                Submit
              </Button>
              <Button onClick={() => navigate(-1)} disabled={false}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </PageContent>
    </>
  )
}

export default ExternalProjectEditPage
