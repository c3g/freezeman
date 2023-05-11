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
import moment from "moment";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../hooks";
const { Item } = Form
const { TextArea } = Input

import { nameRules, requiredRules } from "../../constants";
import { sample as EMPTY_SAMPLE } from "../../models/empty_models";
import { add, listTable, summary, update } from "../../modules/samples/actions";
import { selectAppInitialzed, selectContainerKindsByID, selectSampleKindsState, selectSamplesByID, selectToken } from "../../selectors";
import api, { withToken } from "../../utils/api";
import * as Options from "../../utils/options";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { fetchContainers, fetchSamples } from "../../modules/cache/cache";

export const AddSampleRoute = () => {
  const [sample] = useState({...EMPTY_SAMPLE})
  const isAppReady = useAppSelector(selectAppInitialzed)

  // The form requires the sampleKinds state, so we have to wait until
  // the app has initialized before loading the form.
  return (
    isAppReady && <SampleEditContent sample={sample} isAdding={true}/>
  )
}

export function EditSampleRoute() {
  const { id } = useParams();
  const samplesByID = useAppSelector(selectSamplesByID)
  const [sample, setSample] = useState()
  const isAppReady = useAppSelector(selectAppInitialzed)

  // To handle a page reload, we have to fetch the sample, as it won't be in redux.
  // We also have to wait until the sampleKinds state has been loaded at startup.
  useEffect(() => {
    async function getSample(id) {
      const samples= await fetchSamples([id])
      if (samples.length > 0) {
        setSample(samples[0])
      }
    }

    if(isAppReady && !sample) {
      getSample(id)
    }
  }, [id, isAppReady, sample, samplesByID])

  return sample && <SampleEditContent sample={sample} isAdding={false}/>
}

// API functions

const searchCoordinates = (token, input, options) =>
  withToken(token, api.coordinates.search)(input, options).then(res => res.data.results)

const searchContainers = (token, input, options) =>
  withToken(token, api.containers.search)(input, { sample_holding: true, ...options }).then(res => res.data.results)

const searchIndividuals = (token, input, options) =>
  withToken(token, api.individuals.search)(input, options).then(res => res.data.results)

const listCollectionSites = (token, input) =>
  withToken(token, api.samples.listCollectionSites)(input).then(res => res.data)


const SampleEditContent = ({ sample, isAdding}) => {
  const history = useNavigate()
  const dispatch = useAppDispatch()

  const token = useAppSelector(selectToken)
  const sampleKinds = useAppSelector(selectSampleKindsState)
  const containerKinds = useAppSelector(selectContainerKindsByID);

  const [form] = Form.useForm()
  const [formErrors, setFormErrors] = useState({})

  // Initialize the form with the sample values only once, when the component is mounted.
  // Once the form has been loaded with data we have to keep the form data, and not
  // override it every time some dependency changes.
  useEffect(() => {
      const sampleData = deserialize(sample)
      form.setFieldsValue({ ...sampleData })
      if (!isAdding) {
        checkContainer(sampleData.container)
      }
  }, [])  // Do not specify dependencies - this should only run once.


  // We need to know if the selected container requires coordinates, and to know that we
  // have to fetch the container.
  const checkContainer = useCallback(async (containerId) => {
    if (containerId) {
      const containers = await fetchContainers([containerId])
      if (containers.length > 0) {
        const container = containers[0]
        if (containerKinds[container.kind]?.coordinate_spec.length > 0) {
          setIsCoordRequired(true)
        } else {
          setIsCoordRequired(false)
          form.setFieldValue('coordinate', '')
        }
      }
    } else {
      setIsCoordRequired(false)
      form.setFieldValue('coordinate', '')
    }
    
  }, [containerKinds, form])

  useEffect(() => {
    const sampleData = deserialize(sample)
    onSearchSite(sampleData.collection_site)
    onSearchIndividual(sampleData.individual, { exact_match: true })
    onSearchContainer(sampleData.container, { exact_match: true })
    onSearchCoordinate(sampleData.coordinate, { exact_match: true })
    onSearchSampleKind(sampleData.sample_kind)
  }, [sample, onSearchSite, onSearchIndividual, onSearchContainer, onSearchCoordinate, onSearchSampleKind])

  /*
   * Collection site autocomplete
   */

  const [siteOptions, setSiteOptions] = useState([]);
  const onFocusSite = ev => { onSearchSite(ev.target.value) }
  const onSearchSite = useCallback((input) => {
    listCollectionSites(token, input).then(sites => {
      setSiteOptions(sites.map(Options.render))
    })
  }, [token])

  /*
   * Individual autocomplete
   */

  const [individualOptions, setIndividualOptions] = useState([]);
  const onFocusIndividual = ev => { onSearchIndividual(ev.target.value) }
  const onSearchIndividual = useCallback((input, options) => {
    searchIndividuals(token, input, options).then(individuals => {
      setIndividualOptions(individuals.map(Options.renderIndividual))
    })
  },[token])

  /*
   * Sample Kind autocomplete
   */
  const sampleKindsSorted = sampleKinds.items.sort((a, b) => ('' + a.name).localeCompare(b.name))
  const [sampleKindOptions, setSampleKindOptions] = useState(sampleKindsSorted.map(Options.renderSampleKind))
  const onFocusSampleKind = ev => { onSearchSampleKind(ev.target.value) }
  const onSearchSampleKind = useCallback(input => {
    const sampleKindOptions = input ? [sampleKinds.itemsByID[input]] : [...sampleKinds.items]
    setSampleKindOptions(sampleKindOptions.map(Options.renderSampleKind))
  }, [sampleKinds])

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
  const onSearchContainer = useCallback((input, options) => {
    searchContainers(token, input, options).then(containers => {
      setContainerOptions(containers.map(Options.renderContainer));
    })
  }, [token])

  /*
    * Coordinate autocomplete
    */

  const [coordinateOptions, setCoordinateOptions] = useState([]);
  const onFocusCoordinate = ev => { onSearchCoordinate(ev.target.value) }
  const onSearchCoordinate = useCallback((input, options) => {
    searchCoordinates(token, input, options).then(coordinates => {
      setCoordinateOptions(coordinates.map(Options.renderCoordinate))
    })
  }, [token])

  const sampleKind = (sampleKindID) => sampleKinds.itemsByID[sampleKindID]

  const onValuesChange = (values) => {
    const key = Object.keys(values)[0];
    if (key == "sample_kind") {
      if (!sampleKind(values[key]).is_extracted) {
        form.setFieldValue('tissue_source', '')
        setisTissueEnabled(false)
      } else {
        setisTissueEnabled(true)
      }
    }
    if (key == "container") {
      checkContainer(values[key])
    }
  }

  const onSubmit = () => {
    var data = serializeFormData(form)
    if (!isAdding)
      data.id = sample.id
    const action =
      isAdding ?
        dispatch(add(data)).then(sample => { history(`/samples/${sample.id}`) }) :
        dispatch(update(sample.id, data)).then(() => { history(`/samples/${sample.id}`) })
    action
      .then(() => { setFormErrors({}); Promise.all([dispatch(listTable()), dispatch(summary())]) })
      .catch(err => { setFormErrors(err.data || {}) })
  }

  const onCancel = useCallback(() => {
    history(-1)
  }, [history])


  /*
   * Render
   */

  const title = isAdding ?
    'Add Sample' :
    `Update Sample ${sample?.name}`

  const props = name =>
    !formErrors[name] ? { name } : {
      name,
      hasFeedback: true,
      validateStatus: 'error',
      help: formErrors[name],
    }


  const [isTissueEnabled, setisTissueEnabled] = useState((form.getFieldValue('sample_kind') && sampleKind(form.getFieldValue('sample_kind')).is_extracted) || (!isAdding && sampleKind(sample.sample_kind).is_extracted))
  const [isCoordRequired, setIsCoordRequired] = useState(form.getFieldValue('container') || !isAdding)

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
            <Switch />
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
  var newValues = { ...EMPTY_SAMPLE };

  if (form.getFieldValue("collection_site"))
    newValues.collection_site = form.getFieldValue("collection_site")

  if (form.getFieldValue("depleted") != null || form.getFieldValue("depleted") != undefined)
    newValues.depleted = form.getFieldValue("depleted")

  if (!form.getFieldValue("concentration")) {
    newValues.concentration = null
  } else {
    newValues.concentration = form.getFieldValue("concentration")
  }

  if (!form.getFieldValue("experimental_group"))
    newValues.experimental_group = []

  if (form.getFieldValue("creation_date"))
    newValues.creation_date = form.getFieldValue("creation_date").format('YYYY-MM-DD')

  if (!form.getFieldValue("comment")) {
    newValues.comment = ''
  } else {
    newValues.comment = form.getFieldValue("comment")
  }

  if (!form.getFieldValue("experimental_group")) {
    newValues.experimental_group = []
  } else {
    newValues.experimental_group = form.getFieldValue("experimental_group")
  }

  if (!form.getFieldValue("alias")) {
    newValues.alias = null
  } else {
    newValues.alias = form.getFieldValue("alias")
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
    newValues.individual = ""
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
