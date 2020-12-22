import React, {useState} from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";

import {Button, Form, Input, Select} from "antd";
import "antd/es/button/style/css";
import "antd/es/form/style/css";
import "antd/es/input/style/css";
import "antd/es/select/style/css";
const {Option} = Select

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import {add, update} from "../../modules/containers/actions";
import {container as EMPTY_CONTAINER} from "../../models";

const requiredRules = [{ required: true, message: 'Missing field' }]

const mapStateToProps = state => ({
  containerKinds: state.containerKinds.items,
  containersByID: state.containers.itemsByID,
});

const actionCreators = {add, update};

const ContainerEditContent = ({containerKinds, containersByID, add, update}) => {
  const history = useHistory();
  const {id} = useParams();
  const isAdding = id === undefined

  const container = containersByID[id];

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

  const title = id === undefined ?
    'Add Container' :
    ('Update ' + (container ? container.name : `Container ${id}`))

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={history.goBack}
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
          <Form.Item label="Name" name="name" rules={requiredRules}>
            <Input />
          </Form.Item>
          <Form.Item label="Kind" name="kind" rules={requiredRules}>
            <Select>
              {containerKinds.map(kind =>
                <Option key={kind.id} value={kind.id}>{kind.id}</Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item label="Barcode" name="barcode">
            <Input />
          </Form.Item>
          <Form.Item label="Coordinates" name="coordinates">
            <Input />
          </Form.Item>
          <Form.Item label="Comment" name="comment">
            <Input />
          </Form.Item>
          <Form.Item label="Upd. Comment" name="update_comment">
            <Input />
          </Form.Item>
          <Form.Item label="Location" name="location">
            <Input />
          </Form.Item>
          <Form.Item label="Children" name="children">
            <Select mode="tags">
              {[].map(kind =>
                <Option key={kind.id} value={kind.id}>{kind.id}</Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item label="Samples" name="samples">
            <Select mode="tags">
              {[].map(kind =>
                <Option key={kind.id} value={kind.id}>{kind.id}</Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </PageContent>
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ContainerEditContent);
