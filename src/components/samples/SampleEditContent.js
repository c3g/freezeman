import React, {useEffect, useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";

import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Typography,
} from "antd";
import "antd/es/alert/style/css";
import "antd/es/auto-complete/style/css";
import "antd/es/button/style/css";
import "antd/es/date-picker/style/css";
import "antd/es/form/style/css";
import "antd/es/input/style/css";
import "antd/es/input-number/style/css";
import "antd/es/select/style/css";
import "antd/es/switch/style/css";
import "antd/es/typography/style/css";
const {Option} = Select
const {TextArea} = Input

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options";
import {add, update} from "../../modules/samples/actions";
import {sample as EMPTY_SAMPLE} from "../../models";
import {BIOSPECIMEN_TYPE, TISSUE_SOURCE} from "../../constants";
import api, {withToken} from "../../utils/api";

const requiredRules = [{ required: true, message: 'Missing field' }]
const nameRules = [{ pattern: /^[a-zA-Z0-9.\-_]{1,199}$/ }]

// API functions

const searchSamples = (token, input) =>
  withToken(token, api.samples.search)(input).then(res => res.data.results)

const searchContainers = (token, input) =>
  withToken(token, api.containers.search)(input, { sample_holding: true }).then(res => res.data.results)

const searchIndividuals = (token, input) =>
  withToken(token, api.individuals.search)(input).then(res => res.data.results)

let collectionSites = undefined
const listCollectionSites = (token) => {
  if (collectionSites)
    return Promise.resolve(collectionSites)
  collectionSites =  withToken(token, api.samples.listCollectionSites)()
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
});

const actionCreators = {add, update};

const SampleEditContent = ({token, samplesByID, add, update}) => {
  const history = useHistory();
  const {id} = useParams();
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
  const onSearchIndividual = input => {
    searchIndividuals(token, input).then(individuals => {
      setIndividualOptions(individuals.map(Options.renderIndividual))
    })
  }

  /*
   * Container (location) autocomplete
   */

  const [containerOptions, setContainerOptions] = useState([]);
  const onFocusContainer = ev => { onSearchContainer(ev.target.value) }
  const onSearchContainer = input => {
    searchContainers(token, input).then(containers => {
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
    onSearchIndividual(newData.individual)
    onSearchContainer(newData.container)
    onSearchSample(newData.extracted_from)
  }, [sampleValue])

  const onValuesChange = (values) => {
    setFormData(deserialize({ ...formData, ...values }))
  }

  const onSubmit = () => {
    const data = serialize(formData)
    const action =
      isAdding ?
        add(data).then(sample => { history.push(`/samples/${sample.id}`) }) :
        update(id, data).then(() => { history.push(`/samples/${id}`) })
    action
    .then(() => { setFormErrors({}) })
    .catch(err => { setFormErrors(err.data || {}) })
  }


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

  const isTissueEnabled = tissueEnabled(formData?.biospecimen_type)

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push(`/samples/${id || 'list'}`)}
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
          <Form.Item label="Biosp. Type" {...props("biospecimen_type")} rules={requiredRules}>
            <Select>
              {BIOSPECIMEN_TYPE.map(type =>
                <Option key={type} value={type}>{type}</Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item label="Tissue" {...props("tissue_source")} rules={isTissueEnabled ? requiredRules : undefined}>
            <Select allowClear disabled={!isTissueEnabled}>
              {TISSUE_SOURCE.map(type =>
                <Option key={type} value={type}>{type}</Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item label="Individual" {...props("individual")} rules={requiredRules}>
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
          <Form.Item label="Exp. Group" {...props("experimental_group")}>
            <Select mode="tags" />
          </Form.Item>
          <Form.Item label="Collection Site" {...props("collection_site")} rules={requiredRules}>
            <AutoComplete
              options={siteOptions}
              onSearch={onSearchSite}
              onFocus={onFocusSite}
            />
          </Form.Item>
          <Form.Item label="Reception" {...props("reception_date")} rules={requiredRules}>
            <DatePicker />
          </Form.Item>
          <Form.Item label="Phenotype" {...props("phenotype")}>
            <Input />
          </Form.Item>
          <Form.Item label="Comment" {...props("comment")}>
            <TextArea />
          </Form.Item>
          <Form.Item label="Upd. Comment" {...props("update_comment")}>
            <TextArea />
          </Form.Item>
          <Form.Item label="Extracted From" {...props("extracted_from")}>
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={sampleOptions}
              onSearch={onSearchSample}
              onFocus={onFocusSample}
            />
          </Form.Item>
          <Form.Item
            label="Vol. Used (µL)"
            {...props("volume_used")}
            extra="Volume of the original sample used for the extraction, in µL. Must be specified only for extracted nucleic acid samples."
          >
            <InputNumber
              disabled={!formData?.extracted_from}
              step={0.001}
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
}

function deserialize(values) {
  if (!values)
    return undefined
  const newValues = {...values}

  /* tissue_source bottom value is '' for legacy reasons */
  if (!newValues.tissue_source)
    newValues.tissue_source = null

  if (newValues.experimental_group === null)
    newValues.experimental_group = []
  if (newValues.reception_date)
    newValues.reception_date = moment(newValues.reception_date, 'YYYY-MM-DD')
  return newValues
}

function serialize(values) {
  const newValues = {...values}

  if (newValues.reception_date)
    newValues.reception_date = newValues.reception_date.format('YYYY-MM-DD')

  /* tissue_source bottom value is '' for legacy reasons */
  if (!newValues.tissue_source)
    newValues.tissue_source = ''

  if (newValues.concentration === '')
    newValues.concentration = null
  if (newValues.volume_used === '')
    newValues.volume_used = null

  if (newValues.container)
    newValues.container = Number(newValues.container)

  if (typeof newValues.volume === 'number') {
    newValues.volume_history = [{
      date: new Date().toISOString(),
      update_type: "update",
      volume_value: String(newValues.volume),
    }]
    delete newValues.volume
  }
  if (!newValues.volume_history) {
    newValues.volume_history = []
  }

  return newValues
}

export default connect(mapStateToProps, actionCreators)(SampleEditContent);


// Helpers

function tissueEnabled(type) {
  if (type === 'DNA' || type === 'RNA')
    return true
  return false
}
