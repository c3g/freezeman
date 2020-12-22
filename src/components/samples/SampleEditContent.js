import React, {useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";

import {Button, DatePicker, Form, Input, Select} from "antd";
import "antd/es/button/style/css";
import "antd/es/date-picker/style/css";
import "antd/es/form/style/css";
import "antd/es/input/style/css";
import "antd/es/select/style/css";
const {Option} = Select

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import {add, update} from "../../modules/samples/actions";
import {sample as EMPTY_SAMPLE} from "../../models";
import {BIOSPECIMEN_TYPE, TISSUE_SOURCE} from "../../constants";

const requiredRules = [{ required: true, message: 'Missing field' }]

const mapStateToProps = state => ({
  samplesByID: state.samples.itemsByID,
});

const actionCreators = {add, update};

const SampleEditContent = ({samplesByID, add, update}) => {
  const history = useHistory();
  const {id} = useParams();
  const isAdding = id === undefined

  const sample = samplesByID[id];

  const [formData, setFormData] = useState(deserialize(isAdding ? EMPTY_SAMPLE : sample))

  if (!isAdding && formData === undefined && sample !== undefined) {
    setFormData(deserialize(sample))
  }

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData)
    if (isAdding) {
      add(data)
      .then(sample => {
        history.push(`/samples/${sample.id}`)
      })
    } else {
      update(id, data)
      .then(() => {
        history.push(`/samples/${id}`)
      })
    }
  }

  const title = id === undefined ?
    'Add Sample' :
    ('Update ' + (sample ? sample.name : `Sample ${id}`))

  // TODO: validate individual, container & extracted_from as valid IDs

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={history.goBack}
      />
      <PageContent>
        <Form
          key={sample ? 'with-sample' : 'without-sample'}
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
          <Form.Item label="Alias" name="alias">
            <Input />
          </Form.Item>
          <Form.Item label="Biosp. Type" name="biospecimen_type">
            <Select>
              {BIOSPECIMEN_TYPE.map(type =>
                <Option key={type} value={type}>{type}</Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item label="Concentration" name="concentration">
            <Input />
          </Form.Item>
          <Form.Item label="Exp. Group" name="experimental_group">
            <Select mode="tags" />
          </Form.Item>
          <Form.Item label="Collection Site" name="collection_site">
            <Input />
          </Form.Item>
          <Form.Item label="Tissue" name="tissue_source">
            <Select>
              {BIOSPECIMEN_TYPE.map(type =>
                <Option key={type} value={type}>{type}</Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item label="Reception" name="reception_date">
            <DatePicker />
          </Form.Item>
          <Form.Item label="Phenotype" name="phenotype">
            <Input />
          </Form.Item>
          <Form.Item label="Comment" name="comment">
            <Input />
          </Form.Item>
          <Form.Item label="Upd. Comment" name="update_comment">
            <Input />
          </Form.Item>
          <Form.Item label="Coordinates" name="coordinates">
            <Input />
          </Form.Item>
          <Form.Item label="Vol. Used" name="volume_used">
            <Input />
          </Form.Item>
          <Form.Item label="Individual" name="individual">
            <Input />
          </Form.Item>
          <Form.Item label="Container" name="container">
            <Input />
          </Form.Item>
          <Form.Item label="Extracted" name="extracted_from">
            <Input />
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

function deserialize(values) {
    if (!values)
        return undefined
    const newValues = { ...values }
    if (newValues.reception_date)
        newValues.reception_date = moment(newValues.reception_date, 'YYYY-MM-DD')
    return newValues
}

function serialize(values) {
    const newValues = { ...values }
    if (newValues.reception_date)
        newValues.reception_date = newValues.reception_date.format('YYYY-MM-DD')
    return newValues
}

export default connect(mapStateToProps, actionCreators)(SampleEditContent);
