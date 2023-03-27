import React, { useCallback, useEffect, useState } from "react";
import { connect } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Form, Input, Select, Space } from "antd";
const { Option } = Select;
const { Item } = Form;
const { TextArea } = Input;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options";
import { add, update, listTable, summary } from "../../modules/containers/actions";
import { container as EMPTY_CONTAINER } from "../../models/empty_models";
import api, { withToken } from "../../utils/api";
import { requiredRules, barcodeRules, nameRules } from "../../constants";

const searchContainers = (token, input, options) =>
  withToken(token, api.containers.search)(input, options)
    .then(res => res.data.results)

const searchCoordinates = (token, input, options) =>
  withToken(token, api.coordinates.search)(input, options)
    .then(res => res.data.results)

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  containerKinds: state.containerKinds.items,
  containersByID: state.containers.itemsByID,
});

const actionCreators = { add, update, listTable, summary };

const ContainerEditContent = ({ token, containerKinds, containersByID, add, update, listTable, summary }) => {
  const history = useNavigate();
  const { id } = useParams();
  const isAdding = id === undefined

  const container = containersByID[id];

  /*
   * Location autocomplete
   */

  const [locationOptions, setLocationOptions] = useState([]);
  const onFocusLocation = ev => { onSearchLocation(ev.target.value) }
  const onSearchLocation = (input, options) => {
    searchContainers(token, input, { ...options, parent: true }).then(containers => {
      setLocationOptions(containers.map(Options.renderContainer))
    })
  }

  /*
    * Coordinate autocomplete
    */

  const [coordinateOptions, setCoordinateOptions] = useState([]);
  const onFocusCoordinate = ev => { onSearchCoordinate(ev.target.value) }
  const onSearchCoordinate = (input, options) => {
    searchCoordinates(token, input, options).then(coordinates => {
      setCoordinateOptions(coordinates.map(Options.renderCoordinate))
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
    onSearchLocation(newData.location, { exact_match: true })
    onSearchCoordinate(newData.coordinate, { exact_match: true })
  }, [containerValue])

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData)
    const action =
      isAdding ?
        add(data).then(container => { history(`/containers/${container.id}`) }) :
        update(id, data).then(() => { history(`/containers/${id}`) })
    action
      .then(() => { setFormErrors({}) })
      .catch(err => { setFormErrors(err.data || {}) })
      .then(() => Promise.all([listTable(), summary()]))
  }

  const onCancel = useCallback(() => {
    history(-1)
  }, [history])
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

  const isCoordRequired = formData?.location

  return (
    <>
      <AppPageHeader
        title={title}
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
          <Item label="Name" {...props("name")} rules={nameRules.concat(requiredRules)}>
            <Input />
          </Item>
          <Item label="Kind" {...props("kind")} rules={requiredRules}>
            <Select>
              {containerKinds.map(kind =>
                kind.is_run_container || <Option key={kind.id} value={kind.id}>{kind.id}</Option>
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
            <Item label="@" {...props("coordinate")} style={{ display: 'inline-block', width: '38%'}}>
              <Select
                showSearch
                allowClear
                disabled={!isCoordRequired}
                filterOption={false}
                options={coordinateOptions}
                onSearch={onSearchCoordinate}
                onFocus={onFocusCoordinate}
              />
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
            <Space>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
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

  if (newValues.coordinate)
    newValues.coordinate = Number(newValues.coordinate)
  
  return newValues
}

function serialize(values) {
  const newValues = { ...values }

  if (!newValues.coordinate)
    newValues.coordinate = null

  return newValues
}

export default connect(mapStateToProps, actionCreators)(ContainerEditContent);
