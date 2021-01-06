import React, {useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";

import {AutoComplete, Button, Form, Input, Radio} from "antd";
import "antd/es/auto-complete/style/css";
import "antd/es/button/style/css";
import "antd/es/form/style/css";
import "antd/es/input/style/css";
import "antd/es/radio/style/css";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options";
import {add, update} from "../../modules/individuals/actions";
import {individual as EMPTY_INDIVIDUAL} from "../../models";
import {SEX, TAXON} from "../../constants";
import api, {withToken} from "../../utils/api";

const requiredRules = [{ required: true, message: 'Missing field' }]

const searchIndividuals = (token, input) =>
  withToken(token, api.individuals.search)(input).then(res => res.data.results)

const toOptions = values =>
    values.map(v => ({label: v, value: v}))

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  individualsByID: state.individuals.itemsByID,
});

const actionCreators = {add, update};

const IndividualEditContent = ({token, individualsByID, add, update}) => {
  const history = useHistory();
  const {id} = useParams();
  const isAdding = id === undefined

  const individual = individualsByID[id];

  /*
   * Form Data submission
   */

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
      add(data).then(individual => { history.push(`/individuals/${individual.id}`) })
    } else {
      update(id, data).then(() => { history.push(`/individuals/${id}`) })
    }
  }

  /*
   * Individual autocomplete
   */

  const [individualOptions, setIndividualOptions] = useState([]);
  const onFocusIndividual = ev => { onSearchIndividual(ev.target.value) }
  const onSearchIndividual = input => {
    searchIndividuals(token, input).then(individuals => {
      setIndividualOptions(individuals.map(Options.renderIndividual))
    })
  }

  /*
   * Render
   */

  const title = id === undefined ?
    'Add Individual' :
    `Update Individual ${individual ? individual.label : id}`

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push(`/individuals/${id || 'list'}`)}
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
            <AutoComplete
              options={individualOptions}
              onSearch={onSearchIndividual}
              onFocus={onFocusIndividual}
            />
          </Form.Item>
          <Form.Item label="Father" name="father">
            <AutoComplete
              options={individualOptions}
              onSearch={onSearchIndividual}
              onFocus={onFocusIndividual}
            />
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
