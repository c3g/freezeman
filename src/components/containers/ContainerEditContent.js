import React, {useState} from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";

import {AutoComplete, Button, Form, Input, Select, Typography} from "antd";
import "antd/es/auto-complete/style/css";
import "antd/es/button/style/css";
import "antd/es/form/style/css";
import "antd/es/input/style/css";
import "antd/es/select/style/css";
import "antd/es/typography/style/css";
const {Option} = Select
const {Item} = Form
const {Text} = Typography

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import {add, update} from "../../modules/containers/actions";
import {container as EMPTY_CONTAINER} from "../../models";
import api, {withToken} from "../../utils/api";

const requiredRules = [{ required: true, message: 'Missing field' }]

const listParentContainers = (token, input) =>
  withToken(token, api.containers.listParentContainers)(input)
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
   * Form Data submission
   */

  const [formData, setFormData] = useState(isAdding ? EMPTY_CONTAINER : container)

  if (!isAdding && formData === undefined && container !== undefined) {
    setFormData(container)
  }

  const onValuesChange = (values) => {
    setFormData({ ...formData, ...values })
  }

  const onSubmit = () => {
    if (isAdding) {
      add(formData)
      .then(container => {
        history.push(`/containers/${container.id}`)
      })
    } else {
      update(id, formData)
      .then(() => {
        history.push(`/containers/${id}`)
      })
    }
  }

  /*
   * Location autocomplete
   */

  const [locationOptions, setLocationOptions] = useState([]);

  const onFocusLocation = ev => { onSearchLocation(ev.target.value) }
  const onSearchLocation = input => {
    listParentContainers(token, input).then(containers => {
      setLocationOptions(containers.map(renderContainerOption))
    })
  }

  /*
   * Rendering
   */

  const title = id === undefined ?
    'Add Container' :
    ('Update ' + (container ? container.name : `Container ${id}`))

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push(`/containers/${id}`)}
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
          <Item label="Name" name="name" rules={requiredRules}>
            <Input />
          </Item>
          <Item label="Kind" name="kind" rules={requiredRules}>
            <Select>
              {containerKinds.map(kind =>
                <Option key={kind.id} value={kind.id}>{kind.id}</Option>
              )}
            </Select>
          </Item>
          <Item label="Barcode" name="barcode" rules={[{ pattern: /^[a-zA-Z0-9.\-_]{1,199}$/ }]}>
            <Input />
          </Item>
          <Item label="Location" name="location">
            <AutoComplete
              options={locationOptions}
              onSearch={onSearchLocation}
              onFocus={onFocusLocation}
            />
          </Item>
          <Item label="Coordinates" name="coordinates">
            <Input />
          </Item>
          <Item label="Comment" name="comment">
            <Input />
          </Item>
          <Item label="Upd. Comment" name="update_comment">
            <Input />
          </Item>
          <Item label="Children" name="children">
            <Select mode="tags">
              {[].map(kind =>
                <Option key={kind.id} value={kind.id}>{kind.id}</Option>
              )}
            </Select>
          </Item>
          <Item label="Samples" name="samples">
            <Select mode="tags">
              {[].map(kind =>
                <Option key={kind.id} value={kind.id}>{kind.id}</Option>
              )}
            </Select>
          </Item>
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

function renderContainerOption(c) {
  return {
    value: String(c.id),
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {c.name}
        <Text type="secondary">{c.id}</Text>
      </div>
    )
  }
}

export default connect(mapStateToProps, actionCreators)(ContainerEditContent);
