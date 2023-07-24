import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  Space,
  Switch,
} from "antd";
const { TextArea } = Input
import { Rule } from 'antd/lib/form'

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { add, update, summary } from "../../modules/projects/actions";
import { project as EMPTY_PROJECT } from "../../models/empty_models";
import { requiredRules, nameRules, externalIdRules } from "../../constants";
import ProjectsTableActions from '../../modules/projectsTable/actions'
import { useAppDispatch, useAppSelector } from "../../hooks";
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { selectProjectsByID } from "../../selectors"



const ProjectEditContent = () => {
  const dispatch = useAppDispatch()
  const projectsByID = useAppSelector(selectProjectsByID)

  const history = useNavigate();
  const { id } = useParams();
  const isAdding = id === undefined

  const project = id ? projectsByID[id] : undefined
  const user = useCurrentUser()
  const isAdmin = user ? user.is_staff : false

  /*
   * Form Data submission
   */

  const [formData, setFormData] = useState(deserialize(isAdding ? EMPTY_PROJECT : project))
  const [formErrors, setFormErrors] = useState<any>({})

  if (!isAdding && formData === undefined && project !== undefined) {
    const newData = deserialize(project)
    setFormData(newData)
  }

  const projectValue = project || EMPTY_PROJECT
  useEffect(() => {
    const newData = deserialize(projectValue)
  }, [projectValue])

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData)
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
      dispatch(summary())
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

  // The emailRule defined in constants.js causes a typescript typing error, so it is redefined here.
  const emailRule: Rule = { type: 'email', message: 'The input is not valid E-mail' }

  return (
    <>
      <AppPageHeader
        title={title}
      />
      <PageContent>
        <Form
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
            <Input />
          </Form.Item>
          <Form.Item label="External Name" {...props("external_name")}
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
          <Form.Item label="Requestor Email" {...props("requestor_email")} rules={[emailRule]}
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

function deserialize(values) {
  if (!values)
    return undefined
  const newValues = { ...values }

  if (!newValues.status || newValues.status === "Closed")
    newValues.status = false
  else
    newValues.status = true

  if (newValues.targeted_end_date)
    newValues.targeted_end_date = moment(newValues.targeted_end_date, 'YYYY-MM-DD')
  return newValues
}

function serialize(values) {
  const newValues = { ...values }

  if (newValues.status === false)
    newValues.status = "Closed"
  else
    newValues.status = "Open"

  if (newValues.targeted_end_date)
    newValues.targeted_end_date = newValues.targeted_end_date.format('YYYY-MM-DD')
  else
    newValues.targeted_end_date = null

  return newValues
}

export default ProjectEditContent
