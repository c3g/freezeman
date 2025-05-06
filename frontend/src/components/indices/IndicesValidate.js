import React, { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Cascader,
  Divider,
  Form,
  InputNumber,
  Select,
  Space
} from "antd";
import { RedoOutlined } from '@ant-design/icons';

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import IndicesValidationResult from "./IndicesValidationResult";
import * as Options from "../../utils/options";
import api, { withToken } from "../../utils/api";
import { list, validate } from "../../modules/indices/actions";
import { requiredRules, positiveIntegerRules } from "../../constants";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectToken } from "../../selectors";

// API functions
const listSets = (token, options) =>
  withToken(token, api.indices.listSets)(options).then(res => res.data)

const IndicesValidate = () => {
  const history = useNavigate();

  const dispatch = useAppDispatch()

  const listIndices = useCallback((options) => {
    return dispatch(list(options))
  }, [dispatch])
  const validateIndices = useCallback((options) => {
    return dispatch(validate(options))
  }, [dispatch])
  const listInstrumentTypes = useCallback(() => {
    return dispatch(api.instrumentTypes.list({ instruments__isnull: false }))
  }, [dispatch])

  const token = useAppSelector(selectToken)

  /*
   * State management
   */

  const [instrumentTypes, setInstrumentTypes] = useState([])
  const [indicesBySet, setIndicesBySet] = useState([])
  const [loadedIndices, setloadedIndices] = useState([])
  const [indexCount, setIndexCount] = useState(0)
  const allIndicesLoaded = indexCount === loadedIndices.length
  const [validationLoading, setValidationLoading] = useState(false)
  const [validationResult, setValidationResult] = useState()

  const instrumentTypesRender = useMemo(() => {
    return instrumentTypes.map(Options.renderInstrumentType)
  }, [instrumentTypes])

  useEffect(() => {
    //List instrument
    listInstrumentTypes().then(response => {
      setInstrumentTypes(response.data.results)
    })
    //List sets and initialize the cascader options
    listSets(token, {}).then(sets => {
      sets.map(set => {
        setIndicesBySet((currentState) => [...currentState,
        {
          label: set.name,
          value: set.id,
          numChildren: set.index_count,
          isLeaf: false,
        }])
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = useCallback((setOptions) => {
    const targetSet = setOptions[setOptions.length - 1]
    const setID = targetSet.value
    const numIndicesInSet = targetSet.numChildren
    const query = { "index_sets__id__in": setID }
    targetSet.loading = true
    setIndexCount(prevIndexCount => prevIndexCount + numIndicesInSet)

    // load options lazily
    listIndices({ ...query }).then(response => {
      const indices = response.results
      const indicesID = indices.map(index => index.id)
      //concatenate existing indices to the retrieved ones
      targetSet.children = indices?.map(index => {
        return {
          label: index.name,
          value: index.id,
          children: [],
        }
      })
      targetSet.loading = false;
      setIndicesBySet([...indicesBySet])
      setloadedIndices(currentIndices => ([...currentIndices, ...indicesID]))
    })
  }, [indicesBySet, listIndices])

  /*
   * Form Data submission
   */

  const [formData, setFormData] = useState({ threshold: 2 })
  const [formErrors, setFormErrors] = useState({})

  const onValuesChange = (values) => {
    values.indices?.map(index => {
      const selectedSet = indicesBySet.find(set => { return set.value === index[0] })
      //load children if they are not loaded
      if (!selectedSet.children) loadData([selectedSet])
    })
    setFormData({ ...formData, ...values })
  }

  const onSubmit = useCallback(() => {
    setValidationLoading(true)
    const data = serialize(formData)
    validateIndices(data)
      .then((response) => {
        setValidationLoading(false)
        setFormErrors({})
        setValidationResult({ ...response })
      })
      .catch(err => {
        setValidationLoading(false)
        setFormErrors(err.data || {})
      })
  }, [formData, serialize, validateIndices])

  const onCancel = useCallback(() => {
    history(-1)
  }, [history])

  /*
   * Render
   */

  const title = 'Index Validation'

  const props = name =>
    !formErrors[name] ? { name } : {
      name,
      hasFeedback: true,
      validateStatus: 'error',
      help: formErrors[name],
    }

  const serialize = useCallback((values) => {
    const newValues = { ...values }

    if (newValues.indices) {
      //if the user checks a set box, retrieve all the index children
      newValues.indices = newValues.indices.map(index => {
        //When an index is chosen value returned is [setID, indexID]
        if (index.length > 1)
          return index[1]
        //When a set is chosen you just get [setID]
        else
          return indicesBySet.find(set => {
            return set.value === index[0]
          }).children?.map(index => index.value)
      })
      newValues.indices = [].concat(...newValues.indices).join()
    }

    return newValues
  }, [indicesBySet])

  return (
    <>
      <AppPageHeader
        title={title}
      />
      <PageContent>
        {validationResult
          ?
          <div style={{ marginBottom: '3rem' }}>
            <IndicesValidationResult validationResult={validationResult} />
            <Button
              type="primary"
              htmlType="submit"
              style={{
                float: 'right',
                margin: '1rem 5rem 0rem 0rem',
              }}
              icon={<RedoOutlined />}
              onClick={() => setValidationResult()}
            >
              Modify validation parameters
            </Button>
          </div>
          :
          <Form
            key={'validation'}
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 14 }}
            layout="horizontal"
            initialValues={formData}
            onValuesChange={onValuesChange}
            onFinish={onSubmit}
          >
            <Form.Item label="Instrument Type" {...props("instrument_type")} rules={requiredRules}>
              <Select
                placeholder="Select an instrument type"
                showSearch
                allowClear
                options={instrumentTypesRender}
                filterOption={(input, option) =>
                  option.label.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              />
            </Form.Item>
            <Form.Item
              label="Index 3' length (i7)"
              {...props("length_3prime")}
              extra="Desired validation length for the index 3 prime"
            >
              <InputNumber step={1} />
            </Form.Item>
            <Form.Item
              label="Index 5' length (i5)"
              {...props("length_5prime")}
              extra="Desired validation length for the index 5 prime"
            >
              <InputNumber step={1} />
            </Form.Item>
            <Form.Item
              label="Indices"
              {...props("indices")}
              extra="Indices chosen for validation."
              rules={requiredRules}
              hasFeedback
              validateStatus={!allIndicesLoaded ? "validating" : ''}
            >
              <Cascader
                style={{ width: "100%" }}
                options={indicesBySet}
                multiple
                dropdownRender={(menus) => {
                  return (
                    <div>
                      {menus}
                      <Divider style={{ margin: 0 }} />
                      <Alert
                        style={{ padding: '5px', marginBottom: '-5px' }}
                        description={"Loading some sets may take some time."}
                        type="warning"
                      />
                    </div>
                  )
                }}
                showSearch={(inputValue, path) =>
                  path.some(option =>
                    option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1)
                }
                loadData={loadData}
                changeOnSelect
              />
            </Form.Item>
            <Form.Item
              label="Threshold"
              {...props("threshold")}
              extra="Allowed read errors at sequencing time."
              rules={positiveIntegerRules.concat(requiredRules)}
            >
              <InputNumber step={1} />
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
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                disabled={!allIndicesLoaded}
                loading={validationLoading}
              >Submit</Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
           
          </Form>
        }
      </PageContent>
    </>
  );
}

export default IndicesValidate
