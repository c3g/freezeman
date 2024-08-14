import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Form, Input, Radio, Select, Space } from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options";
import { add, update } from "../../modules/individuals/actions";
import { individual as EMPTY_INDIVIDUAL } from "../../models/empty_models";
import { SEX } from "../../constants";
import api, { withToken } from "../../utils/api";
import { requiredRules, nameRules } from "../../constants";
import IndividualsTableActions from '../../modules/individualsTable/actions'
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectAuthTokenAccess, selectIndividualsByID, selectReferenceGenomesByID, selectTaxonsByID } from "../../selectors";

const searchIndividuals = (token, input) =>
  withToken(token, api.individuals.search)(input).then(res => res.data.results)

const searchTaxons = (token, input) =>
  withToken(token, api.taxons.search)(input).then(res => res.data.results)

const searchReferenceGenomes = (token, input) =>
  withToken(token, api.referenceGenomes.search)(input).then(res => res.data.results)

const toOptions = values =>
  values.map(v => ({ label: v, value: v }))

const IndividualEditContent = () => {
  const dispatch = useAppDispatch()
  const history = useNavigate();
  const { id } = useParams();
  const isAdding = id === undefined

  const token = useAppSelector(selectAuthTokenAccess)
  const individualsByID = useAppSelector(selectIndividualsByID)
  const taxonsByID = useAppSelector(selectTaxonsByID)
  const referenceGenomesByID = useAppSelector(selectReferenceGenomesByID)

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
    onSearchIndividual(newData.father)
    onSearchTaxon(newData.taxon)
    onSearchReferenceGenome(newData.reference_genome)
  }, [individualValue])

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData)
    const action =
      isAdding ?
        dispatch(add(data)).then(individual => { history(`/individuals/${individual.id}`)  }) :
        dispatch(update(id, data)).then(() => { history(`/individuals/${id}`) })
    action
      .then(() => { 
        setFormErrors({})
        dispatch(IndividualsTableActions.refreshPage())
      })
      .catch(err => { setFormErrors(err.data || {}) })
  }

  const onCancel = useCallback(() => {
    history(-1)
  }, [history])

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
   * Taxon autocomplete
   */

  const [taxonOptions, setTaxonOptions] = useState(Object.values(taxonsByID).map(Options.renderTaxon));
  const onFocusTaxon = ev => { onSearchTaxon(ev.target.value) }
  const onSearchTaxon = input => {
    searchTaxons(token, input).then(taxons => {
      setTaxonOptions(taxons.map(Options.renderTaxon))
    })
  }

  /*
   * Reference Genome autocomplete
   */

  const [referenceGenomeOptions, setReferenceGenomeOptions] = useState(Object.values(referenceGenomesByID).map(Options.renderReferenceGenome));
  const onFocusReferenceGenome = ev => { onSearchReferenceGenome(ev.target.value) }
  const onSearchReferenceGenome = input => {
    searchReferenceGenomes(token, input).then(referenceGenomes => {
      setReferenceGenomeOptions(referenceGenomes.map(Options.renderReferenceGenome))
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
          <Form.Item label="Name" {...props("name")} rules={nameRules.concat(requiredRules)}
            tooltip="Use [a-z], [A-Z], [0-9], or [ - ][ _ ][ . ]. Space not allowed."
            extra="Anonymized unique individual ID." >
            <Input disabled={individual && individual.is_generic}/>
          </Form.Item>
          <Form.Item label="Alias" {...props("alias")}
            extra="Individual name given by the client. Use if client name duplicates an existing individual name in Freezeman." >
            <Input/>
          </Form.Item>
          <Form.Item label="Taxon" {...props("taxon")} rules={requiredRules}
            extra="Taxon identifying the individual. Add taxon to Freezeman if missing from the list." >
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={taxonOptions}
              onSearch={onSearchTaxon}
              onFocus={onFocusTaxon}
            />
          </Form.Item>
          <Form.Item name="referenceGenome" label="Refererence Genome" {...props('reference_genome')}
            extra="Reference genome to be used for this individual." >
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={referenceGenomeOptions}
              onSearch={onSearchReferenceGenome}
              onFocus={onFocusReferenceGenome}
            />
          </Form.Item>
          <Form.Item label="Sex" {...props("sex")} rules={requiredRules}
            extra="Sex of the individual if applicable, unknown otherwise." >
            <Radio.Group
              optionType="button"
              options={toOptions(SEX)}
            />
          </Form.Item>
          <Form.Item label="Pedigree" {...props("pedigree")}
            extra="Pedigree of the individual.">
            <Input/>
          </Form.Item>
          <Form.Item label="Cohort" {...props("cohort")}
            extra="Cohort of the individual.">
            <Input/>
          </Form.Item>
          <Form.Item label="Mother" {...props("mother")}
            extra="Mother of the individual. Must be an existing female individual in Freezeman." >
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={individualOptions}
              onSearch={onSearchIndividual}
              onFocus={onFocusIndividual}
            />
          </Form.Item>
          <Form.Item label="Father" {...props("father")}
            extra="Father of the individual. Must be an existing male individual in Freezeman." >
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
            <Space>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
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

  if (newValues.taxon)
    newValues.taxon = Number(newValues.taxon)
  
  if (newValues.reference_genome)
    newValues.reference_genome = Number(newValues.reference_genome)

  return newValues
}

function serialize(values) {
  const newValues = { ...values }
  if (newValues.sex === '')
    newValues.sex = null

  if (newValues.taxon)
    newValues.taxon = Number(newValues.taxon)

  if (newValues.reference_genome)
    newValues.reference_genome = Number(newValues.reference_genome)

  if (!newValues.father)
    newValues.father = null

  if (!newValues.mother)
    newValues.mother = null 

  return newValues
}

export default IndividualEditContent
