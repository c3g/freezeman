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
const { Item } = Form
const { TextArea } = Input

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import * as Options from "../../utils/options";
import { add, update, listTable, summary } from "../../modules/samples/actions";
import { sample as EMPTY_SAMPLE } from "../../models/empty_models";
import api, { withToken } from "../../utils/api";
import { requiredRules, nameRules } from "../../constants";

// API functions

const searchSamples = (token, input) =>
  withToken(token, api.samples.search)(input).then(res => res.data.results)

const searchCoordinates = (token, input, options) =>
  withToken(token, api.coordinates.search)(input, options).then(res => res.data.results)

const searchContainers = (token, input, options) =>
  withToken(token, api.containers.search)(input, { sample_holding: true, ...options }).then(res => res.data.results)

const searchIndividuals = (token, input, options) =>
  withToken(token, api.individuals.search)(input, options).then(res => res.data.results)

const listCollectionSites = (token, input) =>
  withToken(token, api.samples.listCollectionSites)(input).then(res => res.data)

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
  const onFocusSite = ev => { onSearchSite(ev.target.value) }
  const onSearchSite = (input) => {
    listCollectionSites(token, input).then(sites => {
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
    * Coordinate autocomplete
    */

  const [coordinateOptions, setCoordinateOptions] = useState([]);
  const onFocusCoordinate = ev => { onSearchCoordinate(ev.target.value) }
  const onSearchCoordinate = (input, options) => {
    searchCoordinates(token, input, options).then(coordinates => {
      setCoordinateOptions(coordinates.map(Options.renderCoordinate))
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

  const [form] = Form.useForm()
  const [formErrors, setFormErrors] = useState({})
  /*
     * Form Data submission
     */


  const sampleValue = sample || EMPTY_SAMPLE
  useEffect(() => {
    const newData = deserialize(sampleValue)
    onSearchSite(newData.collection_site)
    onSearchIndividual(newData.individual, { exact_match: true })
    onSearchContainer(newData.container, { exact_match: true })
    onSearchCoordinate(newData.coordinate, { exact_match: true })
    onSearchSampleKind(newData.sample_kind)
  }, [sampleValue])

  const sampleKind = (sampleKindID) => sampleKinds.itemsByID[sampleKindID]

  const onValuesChange = (values) => {
    if (values["sample_kind"]) {
      if (!sampleKind(values["sample_kind"]).is_extracted) {
        form.setFieldValue('tissue_source', '')
        setisTissueEnabled(false)
      } else {
        setisTissueEnabled(true)
      }
    }
  }

  const onSubmit = () => {
    const data = serializeFormData(form)
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


  const [isTissueEnabled, setisTissueEnabled] = useState(form.getFieldValue('sample_kind') && sampleKind(form.getFieldValue('sample_kind')).is_extracted)
  const isCoordRequired = form.getFieldValue('container')

  return (
    <>
      <AppPageHeader
        title={title}
      />
      <PageContent>
        <Form
          form={form}
          key={sample ? 'with-sample' : 'without-sample'}
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 14 }}
          layout="horizontal"
          onValuesChange={onValuesChange}
          onFinish={onSubmit}
        >
          <Item label="Name" {...props("name")} rules={requiredRules.concat(nameRules)}>
            <Input />
          </Item>
          <Item label="Alias" {...props("alias")} extra="Defaults to the name if left empty.">
            <Input />
          </Item>
          <Item label="Sample Kind" {...props("sample_kind")} rules={requiredRules}>
            <Select
              options={sampleKindOptions}
              onSearch={onSearchSampleKind}
              onFocus={onFocusSampleKind}
            />
          </Item>
          <Item label="Tissue Source" {...props("tissue_source")}>
            <Select
              allowClear
              disabled={!isTissueEnabled}
              options={tissueSourceOptions}
              onSearch={onSearchTissueSource}
              onFocus={onFocusTissueSource}
            />
          </Item>
          <Item label="Individual" {...props("individual")}>
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={individualOptions}
              onSearch={onSearchIndividual}
              onFocus={onFocusIndividual}
            />
          </Item>
          <Item label="Container" {...props("container")} rules={requiredRules}>
            <Select
              showSearch
              allowClear
              filterOption={false}
              options={containerOptions}
              onSearch={onSearchContainer}
              onFocus={onFocusContainer}
            />
          </Item>
          <Item label="Coordinates" {...props("coordinate")}>
            <Select
              showSearch
              allowClear
              disabled={!isCoordRequired}
              filterOption={false}
              options={coordinateOptions}
              onSearch={onSearchCoordinate}
              onFocus={onFocusCoordinate}
            />
          </Item>
          <Item label="Depleted" {...props("depleted")} valuePropName="checked">
            <Switch/>
          </Item>
          {isAdding &&
            <Item
              label="Vol. (µL)"
              {...props("volume")}
              rules={requiredRules}
            >
              <InputNumber step={0.001} />
            </Item>
          }
          <Item
            label="Conc. (ng/µL)"
            {...props("concentration")}
            extra="Concentration in ng/µL."
          >
            <InputNumber step={0.001} />
          </Item>
          <Item label="Exp. Group" {...props("experimental_group")}>
            <Select mode="tags" />
          </Item>
          <Item label="Collection Site" {...props("collection_site")}>
            <AutoComplete
              options={siteOptions}
              onSearch={onSearchSite}
              onFocus={onFocusSite}
            />
          </Item>
          <Item label="Reception/Creation" {...props("creation_date")} rules={requiredRules}>
            <DatePicker />
          </Item>
          <Item label="Comment" {...props("comment")}>
            <TextArea />
          </Item>
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
          <Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
          </Item>
        </Form>
      </PageContent>
    </>
  );
}

function deserialize(values) {
  if (!values)
    return undefined
  const newValues = { ...values }

  if (!newValues.alias)
    newValues.alias = null

  if (!newValues.tissue_source)
    newValues.tissue_source = null

  if (newValues.individual)
    newValues.individual = Number(newValues.individual)

  if (newValues.container)
    newValues.container = Number(newValues.container)

  if (newValues.coordinate)
    newValues.coordinate = Number(newValues.coordinate)

  if (newValues.sample_kind)
    newValues.sample_kind = Number(newValues.sample_kind)

  if (newValues.experimental_group === null)
    newValues.experimental_group = []

  if (newValues.creation_date)
    newValues.creation_date = moment(newValues.creation_date, 'YYYY-MM-DD')

  return newValues
}

function serializeFormData(form) {
  var newValues = EMPTY_SAMPLE;

  if (form.getFieldValue("collection_site"))
    newValues.collection_site = form.getFieldValue("collection_site")

  if (form.getFieldValue("depleted") != null || form.getFieldValue("depleted") != undefined)
    newValues.depleted = form.getFieldValue("depleted")

  if (!form.getFieldValue("comment"))
    newValues.comment = ''

  if (!form.getFieldValue("concentration"))
    newValues.concentration = null

  if (form.getFieldValue("experimental_group"))
    newValues.experimental_group = []

  if (form.getFieldValue("creation_date"))
    newValues.creation_date = form.getFieldValue("creation_date").format('YYYY-MM-DD')

  if (!form.getFieldValue("alias")) {
    newValues.alias = form.getFieldValue("name")
  }

  if (!form.getFieldValue("tissue_source")) {
    newValues.tissue_source = null
  } else {
    newValues.tissue_source = form.getFieldValue("tissue_source")
  }

  if (form.getFieldValue("container")) {
    newValues.container = Number(form.getFieldValue("container"))
  }

  if (form.getFieldValue("sample_kind"))
    newValues.sample_kind = Number(form.getFieldValue("sample_kind"))

  if (!form.getFieldValue("individual")) {
    newValues.individual = null
  } else {
    newValues.individual = Number(form.getFieldValue("individual"))
  }

  if (!form.getFieldValue("coordinate")) {
    newValues.coordinate = null
  } else {
    newValues.coordinate = Number(form.getFieldValue("coordinate"))
  }

  newValues.volume = form.getFieldValue("volume")
  newValues.name = form.getFieldValue("name")



  return newValues
}

export default connect(mapStateToProps, actionCreators)(SampleEditContent);
