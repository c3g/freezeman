import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";
import {Alert, Button, Form, Input, Select} from "antd";
const {Option} = Select;
const {Item} = Form;
const {TextArea} = Input;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options";
import {add, update} from "../../modules/containers/actions";
import {container as EMPTY_CONTAINER} from "../../models";
import api, {withToken} from "../../utils/api";

const requiredRules = [{ required: true, message: 'Missing field' }]
const barcodeRules = [{ pattern: /^[a-zA-Z0-9.\-_]{1,199}$/ }]

const searchContainers = (token, input, isParent = false) =>
  withToken(token, api.containers.search)(input, { parent: isParent })
  .then(res => res.data.results)

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  containerKinds: state.containerKinds.items,
  containersByID: state.containers.itemsByID,
});

const actionCreators = {add, update};

const ContainerEditContent = ({token, containerKinds, containersByID, add, update}) => {
  const history = useHistory();
  const {id} = useParams();
  const isAdding = id === undefined

  const container = containersByID[id];

  /*
   * Location autocomplete
   */

  const [locationOptions, setLocationOptions] = useState([]);
  const onFocusLocation = ev => { onSearchLocation(ev.target.value) }
  const onSearchLocation = input => {
    searchContainers(token, input, true).then(containers => {
      setLocationOptions(containers.map(Options.renderContainer))
    })
  }

  /*
   * Form Data submission
   */

  const [formData, setFormData] = useState(deserialize(isAdding ? EMPTY_CONTAINER : container))
  const [formErrors, setFormErrors] = useState({})

  if (!isAdding && formData === undefined && container !== undefined) {
    const newData = deserialize(container)
    setFormData(newData)
  }

  const containerValue = container || EMPTY_CONTAINER
  useEffect(() => {
    const newData = deserialize(containerValue)
    onSearchLocation(newData.location)
  }, [containerValue])

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData)
    const action =
      isAdding ?
        add(data).then(container => { history.push(`/containers/${container.id}`) }) :
        update(id, data).then(() => { history.push(`/containers/${id}`) })
    action
    .then(() => { setFormErrors({}) })
    .catch(err => { setFormErrors(err.data || {}) })
  }

  /*
   * Rendering
   */

  const title = id === undefined ?
    'Add Container' :
    `Update Container ${container ? container.name : id}`

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
        onBack={() => history.push(`/containers/${id || 'list'}`)}
      />
      <PageContent>
        <Form
          key={container ? 'with-container' : 'without-container'}
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          layout="horizontal"
          initialValues={formData}
          onValuesChange={onValuesChange}
          onFinish={onSubmit}
        >
          <Item label="Name" {...props("name")} rules={requiredRules}>
            <Input />
          </Item>
          <Item label="Kind" {...props("kind")} rules={requiredRules}>
            <Select>
              {containerKinds.map(kind =>
                <Option key={kind.id} value={kind.id}>{kind.id}</Option>
              )}
            </Select>
          </Item>
          <Item
            label="Barcode"
            {...props("barcode")}
            rules={barcodeRules.concat(requiredRules)}
          >
            <Input />
          </Item>
          <Item label="Location" style={{ margin: 0 }}>
            <Item {...props("location")} style={{ display: 'inline-block', width: '60%', marginRight: '1em' }}>
              <Select
                showSearch
                allowClear
                filterOption={false}
                options={locationOptions}
                onSearch={onSearchLocation}
                onFocus={onFocusLocation}
              />
            </Item>
            <Item
              label="@"
              {...props("coordinates")}
              className="ContainerEditContent__coordinates"
              style={{ width: 'calc(40% - 1em)' }}
            >
              <Input placeholder="Coordinates" />
            </Item>
          </Item>
          <Item label="Comment" {...props("comment")}>
            <TextArea />
          </Item>
          <Item label="Upd. Comment" {...props("update_comment")}>
            <TextArea />
          </Item>
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
          <Item>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Item>
        </Form>
      </PageContent>
    </>
  );
};


function deserialize(values) {
    if (!values)
        return undefined
    const newValues = { ...values }
    return newValues
}

function serialize(values) {
    const newValues = { ...values }
    return newValues
}

export default connect(mapStateToProps, actionCreators)(ContainerEditContent);
