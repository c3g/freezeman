import React, {useState, useRef} from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";
import {Alert, Button, Form, Input, Tag, Typography} from "antd";
import { UserOutlined } from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options"
import {updateSelf} from "../../modules/users/actions";

const {Title} = Typography

const hiddenField = {
  position: "absolute",
  top: -10000,
  left: -10000,
}

const requiredRules = [{ required: true, message: 'Missing field' }]

const mapStateToProps = state => ({
  isFetching: state.users.isFetching,
  user: state.users.itemsByID[state.auth.currentUserID],
  error: state.users.error,
  groupsByID: state.groups.itemsByID,
});

const actionCreators = {updateSelf};

const ProfileContent = ({isFetching, groupsByID, user, error, updateSelf}) => {
  const history = useHistory();
  const [state, setState] = useState({ message: undefined, success: undefined });


  /*
   * Form Data submission
   */

  const [key, setKey] = useState(1)
  const [formData, setFormData] = useState(deserialize(user))
  const [formErrors, setFormErrors] = useState({})

  if (formData === undefined && user !== undefined && !user.isFetching) {
    setFormData(deserialize(user))
    setKey(key + 1)
  }

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    let data
    try {
      data = serialize(formData, user)
    } catch(err) {
      setState({ message: err.message, success: false })
      return
    }
    setState({ message: undefined, success: undefined })
    updateSelf(data)
      .then(() => {
        setFormErrors({})
        setState({ message: 'Profile updated', success: true })
      })
      .catch(err => {
        console.log(err)
        setFormErrors(err.data || {})
      })
  }

  /*
   * Render
   */

  const props = name =>
    !formErrors[name] ? { name } : {
      name,
      hasFeedback: true,
      validateStatus: 'error',
      help: formErrors[name],
    }

  const errors = []
    .concat(formErrors?.non_field_errors)
    .concat(formErrors?.detail)
    .concat(error?.message)
    .concat(state.success === false ? state.message : [])
    .filter(Boolean)

  return (
    <>
      <AppPageHeader
        title='Profile'
        onBack={() => history.goBack()}
      />
      <PageContent>
        <div>
          <Title level={2}><UserOutlined /> {user?.username}</Title>
          <Form
            key={key}
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 12 }}
            layout="horizontal"
            autoComplete="off"
            initialValues={formData}
            onValuesChange={onValuesChange}
            onFinish={onSubmit}
          >
            {/* Google Chrome is very dumb and tries to autocomplete things
              even when we explicitely set autocomplete="new-password". Thus
              we create fake fields, so our real fields stay pristine.
              The tabIndex & placeholder values are filled to make it keyboard
              inaccessible. */}
            <input
              type="password"
              autoComplete="password"
              placeholder="Fake password field"
              style={hiddenField}
              tabIndex="-1"
            />

            <Form.Item label="Email">
              {user?.email}
            </Form.Item>
            <Form.Item
              label="Password"
              {...props("password")}
            >
              <Input
                type="password"
                autoComplete="new-password"
              />
            </Form.Item>
            <Form.Item
              label="(again)"
              name="passwordValidation"
            >
              <Input
                type="password"
                autoComplete="new-password"
              />
            </Form.Item>
            <Form.Item label="First Name" {...props("first_name")} rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Last Name" {...props("last_name")} rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Groups">
              {user?.groups.map(groupId => groupsByID[groupId]).map(Options.renderGroup).map(o => <Tag key={o.value}>{o.label}</Tag>)}
              {user?.groups.length === 0 && 'None'}
            </Form.Item>
            <Form.Item label="Is Staff">
              {user?.is_staff ? 'Yes': 'No'}
            </Form.Item>
            <Form.Item label="Is Superuser">
              {user?.is_superuser ? 'Yes': 'No'}
            </Form.Item>
            {errors.length > 0 &&
              <Alert
                showIcon
                type="error"
                style={{ marginBottom: '1em' }}
                message="Validation error(s)"
                description={
                  <ul>
                    {
                      errors.map(e =>
                        <li key={e}>{e}</li>
                      )
                    }
                  </ul>
                }
              />
            }
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isFetching}
              >
                Update
              </Button>
            </Form.Item>
            {state.success &&
              <Alert
                showIcon
                type="success"
                message={state.message}
              />
            }
          </Form>
        </div>
      </PageContent>
    </>
  );
};

function uniqueKey(object) {
  const ref = useRef(object)
  let key = 1
  if (ref.current !== object) {
    ref.current = object
    key++
  }
  return key
}

function deserialize(values) {
  if (!values)
    return undefined
  const newValues = { ...values }
  return newValues
}

function serialize(values, original) {
  const newValues = { ...values }
  if (!newValues.date_joined)
    newValues.date_joined = new Date().toISOString()

  if (newValues.password) {
    if (newValues.password !== newValues.passwordValidation)
      throw new Error(`Passwords don't match`)
    delete newValues.passwordValidation
  }

  if (original) {
    Object.keys(newValues).forEach(key => {
      if (key === 'id')
        return
      if (String(newValues[key] || '') === String(original[key] || ''))
        delete newValues[key]
    })
  }

  return newValues
}

export default connect(mapStateToProps, actionCreators)(ProfileContent);
