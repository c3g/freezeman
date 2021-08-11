import React, {useEffect, useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
} from "antd";
const {Option} = Select
const {TextArea} = Input

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options";
import {add, update, listTable, summary} from "../../modules/projects/actions";
import {project as EMPTY_PROJECT} from "../../models";
import api, {withToken} from "../../utils/api";

const requiredRules = [{ required: true, message: "Missing field" }]
const emailRules = [{ type: "email", message: "The input is not valid E-mail" }]

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  projectsByID: state.projects.itemsByID,
});

const actionCreators = {add, update, listTable, summary};

const ProjectEditContent = ({token, projectsByID, add, update, listTable, summary}) => {
  const history = useHistory();
  const {id} = useParams();
  const isAdding = id === undefined

  const project = projectsByID[id];
  /*
   * Form Data submission
   */

  const [formData, setFormData] = useState(deserialize(isAdding ? EMPTY_PROJECT: project))
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
        add(data).then(project => { history.push(`/projects/${project.id}`) }) :
        update(id, data).then(() => { history.push(`/projects/${id}`) })
    action
    .then(() => { setFormErrors({}) })
    .catch(err => { setFormErrors(err.data || {}) })
    .then(() => Promise.all([listTable(), summary()]))
  }

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
        onBack={() => history.push(`/projects/${id || 'list'}`)}
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
          <Form.Item label="Status" {...props("status")} rules={requiredRules}>
            <Select>
              <Option key="Ongoing" value="Ongoing" > Ongoing </Option>
              <Option key="Completed" value="Completed" > Completed </Option>
            </Select>
          </Form.Item>
          <Form.Item label="Target End Date" {...props("targeted_end_date")} >
            <DatePicker />
          </Form.Item>
          <Form.Item label="Comments" {...props("comments")}>
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
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </PageContent>
    </>
  );
}

function deserialize(values) {
  if (!values)
    return undefined
  const newValues = {...values}

  if (newValues.targeted_end_date)
    newValues.targeted_end_date = moment(newValues.targeted_end_date, 'YYYY-MM-DD')
  return newValues
}

function serialize(values) {
  const newValues = {...values}

  if (newValues.targeted_end_date)
    newValues.targeted_end_date = newValues.targeted_end_date.format('YYYY-MM-DD')
  else
    newValues.targeted_end_date = null
    
  return newValues
}

export default connect(mapStateToProps, actionCreators)(ProjectEditContent);
