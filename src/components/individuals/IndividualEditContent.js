import React, {useState, useEffect} from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";
import {Alert, Button, Form, Input, Radio, Select} from "antd";

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
  const [formErrors, setFormErrors] = useState({})

  if (!isAdding && formData === undefined && individual !== undefined) {
    setFormData(deserialize(individual))
  }

  const individualValue = individual || EMPTY_INDIVIDUAL
  useEffect(() => {
    const newData = deserialize(individualValue)
    onSearchIndividual(newData.mother)
  }, [individualValue])

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData)
    const action =
      isAdding ?
        add(data).then(individual => { history.push(`/individuals/${individual.id}`) }) :
        update(id, data).then(() => { history.push(`/individuals/${id}`) })
    action
    .then(() => { setFormErrors({}) })
    .catch(err => { setFormErrors(err.data || {}) })
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
    `Update Individual ${individual ? individual.name : id}`

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
          <Form.Item label="Name" {...props("name")} rules={requiredRules}>
            <Input />
          </Form.Item>
          <Form.Item label="Taxon" {...props("taxon")}>
            <Radio.Group
              optionType="button"
              options={toOptions(TAXON)}
            />
          </Form.Item>
          <Form.Item label="Sex" {...props("sex")}>
            <Radio.Group
              optionType="button"
              options={toOptions(SEX)}
            />
          </Form.Item>
          <Form.Item label="Pedigree" {...props("pedigree")}>
            <Input />
          </Form.Item>
          <Form.Item label="Cohort" {...props("cohort")}>
            <Input />
          </Form.Item>
          <Form.Item label="Mother" {...props("mother")}>
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={individualOptions}
              onSearch={onSearchIndividual}
              onFocus={onFocusIndividual}
            />
          </Form.Item>
          <Form.Item label="Father" {...props("father")}>
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={individualOptions}
              onSearch={onSearchIndividual}
              onFocus={onFocusIndividual}
            />
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
};

function deserialize(values) {
    if (!values)
        return undefined
    const newValues = { ...values }
    if (newValues.sex === null)
        newValues.sex = ''
    return newValues
}

function serialize(values) {
    const newValues = { ...values }
    if (newValues.sex === '')
        newValues.sex = null
    return newValues
}

export default connect(mapStateToProps, actionCreators)(IndividualEditContent);
