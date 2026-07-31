import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  Space,
  Switch,
} from "antd";
const { TextArea } = Input

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { add, update } from "../../modules/projects/actions";
import { project as EMPTY_PROJECT } from "../../models/empty_models";
import { requiredRules, nameRules, externalIdRules, emailRules } from "../../constants";
import ProjectsTableActions from '../../modules/projectsTable/actions'
import { useAppDispatch, useAppSelector } from "../../hooks";
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { selectProjectsByID } from "../../selectors"
import dayjs, { Dayjs } from "dayjs";

import api from "../../utils/api"
import * as Options from "../../utils/options";
import { FMSProject } from "../../models/fms_api_models";
import { FormInstance } from "antd/lib/form";

interface FormData {
    name?: string
    external_id?: string
    external_name: string | null
    principal_investigator?: string
    requestor_name?: string
    requestor_email?: string
    status: boolean
    targeted_end_date?: Dayjs
    comment?: string
}

const ProjectEditContent = () => {
  const dispatch = useAppDispatch()
  const projectsByID = useAppSelector(selectProjectsByID)

  const history = useNavigate();
  const { id } = useParams();
  const isAdding = id === undefined

  const project = id ? projectsByID[id] : undefined
  const user = useCurrentUser()
  const isAdmin = user ? user.is_staff : false
  const [form] = Form.useForm<FormData>()

  /*
   * Form Data submission
   */

  const [formData, setFormData] = useState<FormData | undefined>(deserialize(isAdding ? EMPTY_PROJECT : project))
  const [formErrors, setFormErrors] = useState<any>({})

  if (!isAdding && formData === undefined && project !== undefined) {
    const newData = deserialize(project)
    setFormData(newData)
  }

  const projectValue = project || EMPTY_PROJECT

  /*
   * External id autocomplete
   */
  const listParentProjects = useCallback((input) => {
      return dispatch(api.parentProjects.list({ external_id__startswith: input, limit: 100 }))
    }, [dispatch])
  const [externalIdOptions, setExternalIdOptions] = useState(
    'external_id' in projectValue && projectValue.external_id
        ? [projectValue.external_id].map(Options.renderParentProject)
        : []
  )
  const onFocusExternalId = ev => { onSearchExternalId(ev.target.value) }
  const onChangeExternalId = useCallback((input) => {
      if (!input){
        form.setFieldsValue({"external_name": null})
      }
      else {
        listParentProjects(input).then(response => {
          const currentExternalName = response.data.results[0]?.name
          form.setFieldsValue({"external_name": currentExternalName})
        })
      }
    }, [])
  const onSearchExternalId = useCallback((input) => {
    listParentProjects(input).then(response => {
      setExternalIdOptions(response.data.results.map(Options.renderParentProject))
    })
  }, [])

  const onValuesChange = (values) => {
    if (isAdding) {
      setFormData(deserialize({...values}))
    }
    else {
      if (!values.external_id) {
        const newData = { ...formData, ...values, external_id: "", external_name: "" }
        setFormData(deserialize(newData))
      }
      else{
        listParentProjects(values.external_id).then(response => {
            const currentExternalName = response.data.results[0]?.name
            const newData = { ...formData, ...values, external_id: values.external_id, external_name: currentExternalName }
            setFormData(deserialize(newData))
        })
      }
    }
  }



  const onSubmit = () => {
    const data = serialize(form)
    if (!isAdding)
      data.id = Number(id)
    const action =
      isAdding ?
        dispatch(add(data)).then(project => { history(`/projects/${project.id}`) }) :
        dispatch(update(Number(id), data)).then(() => { history(`/projects/${id}`) })
    action
		.then(() => {
			setFormErrors({})
		})
		.catch((err) => {
			setFormErrors(err.data || {})
		})
		.then(() => {
      dispatch(ProjectsTableActions.refreshPage())
    })
  }

  const onCancel = useCallback(() => {
    history(-1)
  }, [history])

  /*
   * Render
   */

  const title = id === undefined ?
    'Add Project' :
    `Update Project ${project ? project.name : id}`

  interface ValidationProps {
    name: string
    hasFeedback?: boolean
    validateStatus?: 'error',
    help?: string
  }

  function props(name: string): ValidationProps {
    return !formErrors[name]
		? { name }
		: {
				name,
				hasFeedback: true,
				validateStatus: 'error',
				help: formErrors[name],
		  }
  }

  return (
    <>
      <AppPageHeader
        title={title}
      />
      <PageContent>
        <Form
          form={form}
          key={project ? 'with-project' : 'without-project'}
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          layout="horizontal"
          initialValues={formData}
          onValuesChange={onValuesChange}
          onFinish={onSubmit}
        >
          <Form.Item label="Name" {...props("name")} rules={requiredRules.concat(nameRules)}
            tooltip="Use [a-z], [A-Z], [0-9], or [ - ][ _ ][ . ]. Space not allowed."
            extra="Simplified internal name to give the project." >
            <Input />
          </Form.Item>
          <Form.Item label="External ID" {...props("external_id")} rules={isAdmin ? externalIdRules : requiredRules.concat(externalIdRules)}
            tooltip="Format: P000000."
            extra="External identifier for the project (Hercules project number)." >
            <AutoComplete
                options={externalIdOptions}
                onSearch={onSearchExternalId}
                onChange={onChangeExternalId}
                onFocus={onFocusExternalId}
            />
          </Form.Item>
          <Form.Item label="External Name" {...props("external_name")} rules={isAdmin ? [] : requiredRules}
            extra="Full external name of the project (Hercules name)." >
            <Input />
          </Form.Item>
          <Form.Item label="Principal Investigator" {...props("principal_investigator")}
            extra="Full name of the principal investigator." >
            <Input />
          </Form.Item>
          <Form.Item label="Requestor Name" {...props("requestor_name")}
            extra="Full name of the contact person that made the project request." >
            <Input />
          </Form.Item>
          <Form.Item label="Requestor Email" {...props("requestor_email")} rules={emailRules}
            extra="Email of the contact for the project." >
            <Input />
          </Form.Item>
          <Form.Item label="Status" {...props("status")} valuePropName="checked">
            <Switch style={{ width: 80 }} checkedChildren="Open" unCheckedChildren="Closed" defaultChecked={isAdding} />
          </Form.Item>
          <Form.Item label="Target End Date" {...props("targeted_end_date")} >
            <DatePicker />
          </Form.Item>
          <Form.Item label="Comment" {...props("comment")}>
            <TextArea />
          </Form.Item>
          {formErrors?.non_field_errors &&
            <Alert
              showIcon
              type="error"
              style={{ marginBottom: '1em' }}
              message="Validation error(s)"
              description={
                <ul>
                  {
                    formErrors.non_field_errors.map(e =>
                      <li key={e}>{e}</li>
                    )
                  }
                </ul>
              }
            />
          }
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </PageContent>
    </>
  );
}

function deserialize(values: Partial<FMSProject> | undefined): FormData | undefined {
  if (!values)
    return undefined
  const newValues: FormData = { ...values }

  if (!newValues.status || newValues.status === "Closed")
    newValues.status = false
  else
    newValues.status = true

  if (newValues.targeted_end_date)
    newValues.targeted_end_date = dayjs(newValues.targeted_end_date)

  return newValues
}

function serialize(form: FormInstance<FormData>): FMSProject {
  const newValues: FMSProject = { ...EMPTY_PROJECT }

  if (form.getFieldValue("name"))
    newValues.name = form.getFieldValue("name")

  if (!form.getFieldValue("external_id") || form.getFieldValue("external_id").length == 0)
    newValues.external_id = null
  else
    newValues.external_id = form.getFieldValue("external_id")

  if (form.getFieldValue("external_name"))
    newValues.external_name = form.getFieldValue("external_name")

  if (form.getFieldValue("principal_investigator"))
    newValues.principal_investigator = form.getFieldValue("principal_investigator")

  if (form.getFieldValue("requestor_name"))
    newValues.requestor_name = form.getFieldValue("requestor_name")

  if (form.getFieldValue("requestor_email"))
    newValues.requestor_email = form.getFieldValue("requestor_email")

  if (form.getFieldValue("status") === false)
    newValues.status = "Closed"
  else
    newValues.status = "Open"

  if (form.getFieldValue("targeted_end_date"))
    newValues.targeted_end_date = form.getFieldValue("targeted_end_date").format('YYYY-MM-DD')
  else
    newValues.targeted_end_date = null

  if (form.getFieldValue("comment"))
    newValues.comment = form.getFieldValue("comment")

  return newValues
}

export default ProjectEditContent
