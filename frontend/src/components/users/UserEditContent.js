import React, {useState, useRef} from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";
import {Alert, Button, Checkbox, Form, Input, Select} from "antd";

import {withUser} from "../../utils/withItem"
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options"
import {add, update} from "../../modules/users/actions";
import {user as EMPTY_USER} from "../../models";

const hiddenField = {
  position: "absolute",
  top: -10000,
  left: -10000,
}

const requiredRules = [{ required: true, message: 'Missing field' }]

const mapStateToProps = state => ({
  isFetching: state.users.isFetching,
  usersByID: state.users.itemsByID,
  error: state.users.error,
  groups: Object.values(state.groups.itemsByID),
});

const actionCreators = {add, update};

const UserEditContent = ({isFetching, groups, usersByID, error, add, update}) => {
  const history = useHistory();
  const {id} = useParams();
  const isAdding = id === undefined

  const user = usersByID[id];

  if (!isFetching && !isAdding && !user) {
    withUser(usersByID, id, () => null, null)
  }

  /*
   * Form Data submission
   */

  const [key, setKey] = useState(1)
  const [formData, setFormData] = useState(deserialize(isAdding ? EMPTY_USER : user))
  const [formErrors, setFormErrors] = useState({})

  if (!isAdding && formData === undefined && user !== undefined && !user.isFetching) {
    setFormData(deserialize(user))
    setKey(key + 1)
  }

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData, user)
    const action =
      isAdding ?
        add(data).then(user => { history.push(`/users/${user.id}`) }) :
        update(id, data).then(() => { history.push(`/users/${id}`) })
    action
    .then(() => { setFormErrors({}) })
    .catch(err => {
    console.log(err)
    setFormErrors(err.data || {}) })
  }

  /*
   * Render
   */

  const title = isAdding ?
    'Add User' :
    `Update User ${user?.username ?? `${id} (loading...)`}`

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
    .filter(Boolean)

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push(`/users/${id || 'list'}`)}
      />
      <PageContent>
        <Form
          key={key}
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
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
            autoComplete="username"
            style={hiddenField}
            placeholder="Fake username field"
            tabIndex="-1"
          />
          <input
            type="password"
            autoComplete="password"
            placeholder="Fake password field"
            style={hiddenField}
            tabIndex="-1"
          />

          <Form.Item label="Username" {...props("username")} rules={requiredRules}>
            <Input autoComplete="not-a-username" />
          </Form.Item>
          <Form.Item label="Email" {...props("email")} rules={requiredRules}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Password"
            {...props("password")}
            rules={isAdding ? requiredRules : undefined}
          >
            <Input
              type="password"
              autoComplete="do-not-show-autocomplete"
            />
          </Form.Item>
          <Form.Item label="First Name" {...props("first_name")} rules={requiredRules}>
            <Input />
          </Form.Item>
          <Form.Item label="Last Name" {...props("last_name")} rules={requiredRules}>
            <Input />
          </Form.Item>
          <Form.Item label="Groups" {...props("groups")}>
            <Select
              mode="multiple"
              allowClear
              options={groups.map(Options.renderGroup)}
            />
          </Form.Item>
          <Form.Item label="Is Staff" {...props("is_staff")} valuePropName="checked">
            <Checkbox />
          </Form.Item>
          <Form.Item label="Is Superuser" {...props("is_superuser")} valuePropName="checked">
            <Checkbox />
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
              Submit
            </Button>
          </Form.Item>
        </Form>
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

export default connect(mapStateToProps, actionCreators)(UserEditContent);
