import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { connect } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
} from "antd";
const { TextArea } = Input

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options";
import { add, update, listTable, summary } from "../../modules/samples/actions";
import { sample as EMPTY_SAMPLE } from "../../models";
import api, { withToken } from "../../utils/api";
import { requiredRules, nameRules } from "../../constants";

// API functions

const searchSamples = (token, input) =>
  withToken(token, api.samples.search)(input).then(res => res.data.results)

const searchContainers = (token, input, options) =>
  withToken(token, api.containers.search)(input, { sample_holding: true, ...options }).then(res => res.data.results)

const searchIndividuals = (token, input, options) =>
  withToken(token, api.individuals.search)(input, options).then(res => res.data.results)

let collectionSites = undefined
const listCollectionSites = (token) => {
  if (collectionSites)
    return Promise.resolve(collectionSites)
  collectionSites = withToken(token, api.samples.listCollectionSites)()
    .then(res => res.data)
    .then(sites => {
      collectionSites = sites
      return collectionSites
    })
  return collectionSites
}

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  samplesByID: state.samples.itemsByID,
  sampleKinds: state.sampleKinds,
});

const actionCreators = { add, update, listTable, summary };

const SampleEditContent = ({ token, samplesByID, sampleKinds, add, update, listTable, summary }) => {
  const history = useNavigate();
  const { id } = useParams();
  const isAdding = id === undefined

  const sample = samplesByID[id];

  /*
   * Collection site autocomplete
   */

  const [siteOptions, setSiteOptions] = useState([]);
  const onFocusSite = onSearchSite
  const onSearchSite = () => {
    listCollectionSites(token).then(sites => {
      setSiteOptions(sites.map(Options.render))
    })
  }

  /*
   * Individual autocomplete
   */

  const [individualOptions, setIndividualOptions] = useState([]);
  const onFocusIndividual = ev => { onSearchIndividual(ev.target.value) }
  const onSearchIndividual = (input, options) => {
    searchIndividuals(token, input, options).then(individuals => {
      setIndividualOptions(individuals.map(Options.renderIndividual))
    })
  }


  /*
   * Sample Kind autocomplete
   */
  const sampleKindsSorted = sampleKinds.items.sort((a, b) => ('' + a.name).localeCompare(b.name))
  const [sampleKindOptions, setSampleKindOptions] = useState(sampleKindsSorted.map(Options.renderSampleKind))
  const onFocusSampleKind = ev => { onSearchSampleKind(ev.target.value) }
  const onSearchSampleKind = input => {
    const sampleKindOptions = input ? [sampleKinds.itemsByID[input]] : [...sampleKinds.items]
    setSampleKindOptions(sampleKindOptions.map(Options.renderSampleKind))
  }

  /*
   * Tissue Source autocomplete
   */
  const tissueSourceSorted = sampleKindsSorted.filter(item => !item.is_extracted)
  const [tissueSourceOptions, setTissueSourceOptions] = useState(tissueSourceSorted.map(Options.renderSampleKind))
  const onFocusTissueSource = ev => { onSearchTissueSource(ev.target.value) }
  const onSearchTissueSource = input => {
    const tissueSourceOptions = input ? [sampleKinds.itemsByID[input]] : [...tissueSourceSorted]
    setTissueSourceOptions(tissueSourceOptions.map(Options.renderSampleKind))
  }

  /*
   * Container (location) autocomplete
   */

  const [containerOptions, setContainerOptions] = useState([]);
  const onFocusContainer = ev => { onSearchContainer(ev.target.value) }
  const onSearchContainer = (input, options) => {
    searchContainers(token, input, options).then(containers => {
      setContainerOptions(containers.map(Options.renderContainer))
    })
  }

  /*
   * Sample autocomplete
   */

  const [sampleOptions, setSampleOptions] = useState([]);
  const onFocusSample = ev => { onSearchSample(ev.target.value) }
  const onSearchSample = input => {
    searchSamples(token, input).then(samples => {
      setSampleOptions(samples.map(Options.renderSample))
    })
  }

  /*
   * Form Data submission
   */

  const [formData, setFormData] = useState(deserialize(isAdding ? EMPTY_SAMPLE : sample))
  const [formErrors, setFormErrors] = useState({})

  if (!isAdding && formData === undefined && sample !== undefined) {
    const newData = deserialize(sample)
    setFormData(newData)
  }

  const sampleValue = sample || EMPTY_SAMPLE
  useEffect(() => {
    const newData = deserialize(sampleValue)
    onSearchSite(newData.collection_site)
    onSearchIndividual(newData.individual, { exact_match: true })
    onSearchContainer(newData.container, { exact_match: true })
    onSearchSampleKind(newData.sample_kind)
  }, [sampleValue])

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData)
    const action =
      isAdding ?
        add(data).then(sample => { history(`/samples/${sample.id}`) }) :
        update(id, data).then(() => { history(`/samples/${id}`) })
    action
      .then(() => { setFormErrors({}) })
      .catch(err => { setFormErrors(err.data || {}) })
      .then(() => Promise.all([listTable(), summary()]))
  }

  const onCancel = useCallback(() => {
    history(-1)
  }, [history])


  /*
   * Render
   */

  const title = id === undefined ?
    'Add Sample' :
    `Update Sample ${sample ? sample.name : id}`

  const props = name =>
    !formErrors[name] ? { name } : {
      name,
      hasFeedback: true,
      validateStatus: 'error',
      help: formErrors[name],
    }

  const sampleKind = (sampleKindID) => sampleKinds.itemsByID[sampleKindID]

  const isTissueEnabled = formData?.sample_kind && sampleKind(formData?.sample_kind).is_extracted

  return (
    <>
      <AppPageHeader
        title={title}
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
          <Form.Item label="Name" {...props("name")} rules={requiredRules.concat(nameRules)}>
            <Input />
          </Form.Item>
          <Form.Item label="Alias" {...props("alias")}>
            <Input />
          </Form.Item>
          <Form.Item label="Sample Kind" {...props("sample_kind")} rules={requiredRules}>
            <Select
              options={sampleKindOptions}
              onSearch={onSearchSampleKind}
              onFocus={onFocusSampleKind}
            />
          </Form.Item>
          <Form.Item label="Tissue Source" {...props("tissue_source")} s>
            <Select
              allowClear
              disabled={!isTissueEnabled}
              options={tissueSourceOptions}
              onSearch={onSearchTissueSource}
              onFocus={onFocusTissueSource}
            />
          </Form.Item>
          <Form.Item label="Individual" {...props("individual")}>
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={individualOptions}
              onSearch={onSearchIndividual}
              onFocus={onFocusIndividual}
            />
          </Form.Item>
          <Form.Item label="Container" {...props("container")} rules={requiredRules}>
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={containerOptions}
              onSearch={onSearchContainer}
              onFocus={onFocusContainer}
            />
          </Form.Item>
          <Form.Item label="Coordinates" {...props("coordinates")}>
            <Input />
          </Form.Item>
          <Form.Item label="Depleted" {...props("depleted")} valuePropName="checked">
            <Switch />
          </Form.Item>
          {isAdding &&
            <Form.Item
              label="Vol. (µL)"
              {...props("volume")}
              rules={requiredRules}
            >
              <InputNumber step={0.001} />
            </Form.Item>
          }
          <Form.Item
            label="Conc. (ng/µL)"
            {...props("concentration")}
            extra="Concentration in ng/µL. Required for nucleic acid samples."
          >
            <InputNumber step={0.001} />
          </Form.Item>
          <Form.Item label="Exp. Group" {...props("experimental_group")} disabled={!isAdding}>
            <Select mode="tags" disabled={!isAdding} />
          </Form.Item>
          <Form.Item label="Collection Site" {...props("collection_site")} rules={requiredRules}>
            <AutoComplete
              options={siteOptions}
              onSearch={onSearchSite}
              onFocus={onFocusSite}
            />
          </Form.Item>
          <Form.Item label="Reception/Creation" {...props("creation_date")} rules={requiredRules}>
            <DatePicker />
          </Form.Item>
          <Form.Item label="Comment" {...props("comment")}>
            <TextArea />
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
}

function deserialize(values) {
  if (!values)
    return undefined
  const newValues = { ...values }

  if (!newValues.tissue_source)
    newValues.tissue_source = null

  if (newValues.individual)
    newValues.individual = Number(newValues.individual)

  if (newValues.container)
    newValues.container = Number(newValues.container)

  if (newValues.sample_kind)
    newValues.sample_kind = Number(newValues.sample_kind)

  if (newValues.experimental_group === null)
    newValues.experimental_group = []
  if (newValues.creation_date)
    newValues.creation_date = moment(newValues.creation_date, 'YYYY-MM-DD')
  return newValues
}

function serialize(values) {
  const newValues = { ...values }

  if (newValues.creation_date)
    newValues.creation_date = newValues.creation_date.format('YYYY-MM-DD')

  if (!newValues.tissue_source)
    newValues.tissue_source = null

  if (!newValues.individual)
    newValues.individual = ''

  if (newValues.concentration === '')
    newValues.concentration = null

  if (newValues.container)
    newValues.container = Number(newValues.container)

  if (!newValues.comment)
    newValues.comment = ''

  return newValues
}

export default connect(mapStateToProps, actionCreators)(SampleEditContent);
