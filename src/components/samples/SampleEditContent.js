import React, {useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";

import {AutoComplete, Button, DatePicker, Form, Input, Select, Typography, InputNumber} from "antd";
import "antd/es/auto-complete/style/css";
import "antd/es/button/style/css";
import "antd/es/date-picker/style/css";
import "antd/es/form/style/css";
import "antd/es/input/style/css";
import "antd/es/input-number/style/css";
import "antd/es/select/style/css";
import "antd/es/typography/style/css";
const {Option} = Select
const {Text} = Typography

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options";
import {add, update} from "../../modules/samples/actions";
import {sample as EMPTY_SAMPLE} from "../../models";
import {BIOSPECIMEN_TYPE, TISSUE_SOURCE} from "../../constants";
import api, {withToken} from "../../utils/api";

const requiredRules = [{ required: true, message: 'Missing field' }]

// API functions

const searchSamples = (token, input) =>
  withToken(token, api.samples.search)(input).then(res => res.data.results)

const searchContainers = (token, input) =>
  withToken(token, api.containers.search)(input).then(res => res.data.results)

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
   * Form Data submission
   */

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
      add(data).then(sample => { history.push(`/samples/${sample.id}`) })
    } else {
      update(id, data).then(() => { history.push(`/samples/${id}`) })
    }
  }

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
   * Render
   */

  const title = id === undefined ?
    'Add Sample' :
    ('Update ' + (sample ? sample.name : `Sample ${id}`))

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push(`/samples/${id}`)}
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
            <InputNumber step={0.001} />
          </Form.Item>
          <Form.Item label="Exp. Group" name="experimental_group">
            <Select mode="tags" />
          </Form.Item>
          <Form.Item label="Collection Site" name="collection_site">
            <AutoComplete
              options={siteOptions}
              onSearch={onSearchSite}
              onFocus={onFocusSite}
            />
          </Form.Item>
          <Form.Item label="Tissue" name="tissue_source">
            <Select>
              {TISSUE_SOURCE.map(type =>
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
            <InputNumber step={0.001} />
          </Form.Item>
          <Form.Item label="Individual" name="individual">
            <AutoComplete
              options={individualOptions}
              onSearch={onSearchIndividual}
              onFocus={onFocusIndividual}
            />
          </Form.Item>
          <Form.Item label="Container" name="container">
            <AutoComplete
              options={containerOptions}
              onSearch={onSearchContainer}
              onFocus={onFocusContainer}
            />
          </Form.Item>
          <Form.Item label="Extracted" name="extracted_from">
            <AutoComplete
              options={sampleOptions}
              onSearch={onSearchSample}
              onFocus={onFocusSample}
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
}

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
    if (newValues.concentration === '')
        newValues.concentration = null
    if (newValues.volume_used === '')
        newValues.volume_used = null
    return newValues
}

export default connect(mapStateToProps, actionCreators)(SampleEditContent);
