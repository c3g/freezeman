import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { connect } from "react-redux";
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

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { add, update, listTable, summary } from "../../modules/projects/actions";
import { project as EMPTY_PROJECT } from "../../models/empty_models";
import { requiredRules, emailRules } from "../../constants";
import ProjectsTableActions from '../../modules/projectsTable/actions'

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  projectsByID: state.projects.itemsByID,
});

const actionCreators = { add, update, listTable, summary };

const ProjectEditContent = ({ token, projectsByID, add, update, listTable, summary }) => {
  const history = useNavigate();
  const { id } = useParams();
  const isAdding = id === undefined

  const project = projectsByID[id];
  /*
   * Form Data submission
   */

  const [formData, setFormData] = useState(deserialize(isAdding ? EMPTY_PROJECT : project))
  const [formErrors, setFormErrors] = useState({})

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
        add(data).then(project => { history(`/projects/${project.id}`) }) :
        update(id, data).then(() => { history(`/projects/${id}`) })
    action
		.then(() => {
			setFormErrors({})
		})
		.catch((err) => {
			setFormErrors(err.data || {})
		})
		.then(() => Promise.all([listTable(), summary()]))
		// .then(() => Promise.all([ProjectsTableActions.refreshPage(), summary()]))
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

  const props = name =>
    !formErrors[name] ? { name } : {
      name,
      hasFeedback: true,
      validateStatus: 'error',
      help: formErrors[name],
    }

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
          <Form.Item label="Name" {...props("name")} rules={requiredRules} >
            <Input />
          </Form.Item>
          <Form.Item label="Principal Investigator" {...props("principal_investigator")} >
            <Input />
          </Form.Item>
          <Form.Item label="Requestor Name" {...props("requestor_name")} >
            <Input />
          </Form.Item>
          <Form.Item label="Requestor Email" {...props("requestor_email")} rules={emailRules} >
            <Input />
          </Form.Item>
          <Form.Item label="Status" {...props("status")} valuePropName="checked">
            <Switch style={{ width: 80 }} checkedChildren="Open" unCheckedChildren="Closed" defaultChecked={isAdding} />
          </Form.Item>
          <Form.Item label="Target End Date" {...props("targeted_end_date")} >
            <DatePicker />
          </Form.Item>
          <Form.Item label="External ID" {...props("external_id")} >
            <Input />
          </Form.Item>
          <Form.Item label="External Name" {...props("external_name")} >
            <Input />
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

export default connect(mapStateToProps, actionCreators)(ProjectEditContent);
