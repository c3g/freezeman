import React, {useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";

import {Button, DatePicker, Form, Input, Radio, Select} from "antd";
import "antd/es/button/style/css";
import "antd/es/date-picker/style/css";
import "antd/es/form/style/css";
import "antd/es/input/style/css";
import "antd/es/radio/style/css";
import "antd/es/select/style/css";
const {Option} = Select

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import {add, update} from "../../modules/individuals/actions";
import {individual as EMPTY_INDIVIDUAL} from "../../models";
import {SEX, TAXON} from "../../constants";

const requiredRules = [{ required: true, message: 'Missing field' }]

const toOptions = values =>
    values.map(v => ({label: v, value: v}))

const mapStateToProps = state => ({
  individualsByID: state.individuals.itemsByID,
});

const actionCreators = {add, update};

const IndividualEditContent = ({individualsByID, add, update}) => {
  const history = useHistory();
  const {id} = useParams();
  const isAdding = id === undefined

  const individual = individualsByID[id];

  const [formData, setFormData] = useState(deserialize(isAdding ? EMPTY_INDIVIDUAL : individual))

  if (!isAdding && formData === undefined && individual !== undefined) {
    setFormData(deserialize(individual))
  }

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData)
    if (isAdding) {
      add(data)
      .then(individual => {
        history.push(`/individuals/${individual.id}`)
      })
    } else {
      update(id, data)
      .then(() => {
        history.push(`/individuals/${id}`)
      })
    }
  }

  const title = id === undefined ?
    'Add Individual' :
    ('Update ' + (individual ? individual.label : `Individual ${id}`))

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push(`/individuals/${id}`)}
      />
      <PageContent>
        <Form
          key={individual ? 'with-individual' : 'without-individual'}
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          layout="horizontal"
          initialValues={formData}
          onValuesChange={onValuesChange}
          onFinish={onSubmit}
        >
          <Form.Item label="Label" name="label" rules={requiredRules}>
            <Input />
          </Form.Item>
          <Form.Item label="Taxon" name="taxon">
            <Radio.Group
              optionType="button"
              options={toOptions(TAXON)}
            />
          </Form.Item>
          <Form.Item label="Sex" name="sex">
            <Radio.Group
              optionType="button"
              options={toOptions(SEX)}
            />
          </Form.Item>
          <Form.Item label="Pedigree" name="pedigree">
            <Input />
          </Form.Item>
          <Form.Item label="Cohort" name="cohort">
            <Input />
          </Form.Item>
          <Form.Item label="Mother" name="mother">
            <Input />
          </Form.Item>
          <Form.Item label="Father" name="father">
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
    if (newValues.sex === null)
        newValues.sex = ''
    if (newValues.sex === null)
        newValues.sex = ''
    return newValues
}

function serialize(values) {
    const newValues = { ...values }
    if (newValues.sex === '')
        newValues.sex = null
    if (newValues.sex === '')
        newValues.sex = null
    return newValues
}

export default connect(mapStateToProps, actionCreators)(IndividualEditContent);
