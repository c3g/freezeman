import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {useHistory} from "react-router-dom";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Cascader,
  Divider,
  Typography
} from "antd";
const {Option} = Select
const {Text} = Typography;
import { RedoOutlined } from '@ant-design/icons';

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import IndicesValidationResult from "./IndicesValidationResult";
import * as Options from "../../utils/options";
import api, {withToken} from "../../utils/api";
import {validate, list} from "../../modules/indices/actions";
import {requiredRules} from "../../constants";

// API functions
const listSets = (token, options) =>
  withToken(token, api.indices.listSets)(options).then(res => res.data)

const listInstrumentTypes = (token, options) =>
  withToken(token, api.instruments.listTypes)(options).then(res => res.data)


const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  indicesTotalCount: state.indices.totalCount,
  isFetching: state.indices.isFetching,
});

const actionCreators = {list, validate};

const IndicesValidate = ({token, indicesTotalCount, isFetching, list, validate}) => {
  const history = useHistory();

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

  useEffect(() => {
    //List instrument
    listInstrumentTypes(token).then(instrumentTypes => {
      setInstrumentTypes(instrumentTypes.map(Options.renderInstrumentType))
    })
    //List sets and initialize the cascader options
    listSets(token, {}).then(sets => {
      sets.map(set => {
        setIndicesBySet((currentState) => [ ...currentState,
        {
          label: set.name,
          value: set.id,
          numChildren: set.index_count,
          isLeaf: false,
        }])
      })
    })
  }, [])

  const loadData = (setOptions) => {
    const targetSet = setOptions[setOptions.length - 1]
    const setID = targetSet.value
    const numIndicesInSet = targetSet.numChildren
    const query = {"index_set__id__in": setID}
    targetSet.loading = true
    setIndexCount(prevIndexCount =>  prevIndexCount + numIndicesInSet)

    // load options lazily
    list({...query}).then(response => {
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
  }

  /*
   * Form Data submission
   */

  const [formData, setFormData] = useState({threshold : 2})
  const [formErrors, setFormErrors] = useState({})

  const onValuesChange = (values) => {
    values.indices?.map(index => {
      const selectedSet = indicesBySet.find(set => { return set.value === index[0] })
      //load children if they are not loaded
      if(!selectedSet.children) loadData([selectedSet])
    })
    setFormData({ ...formData, ...values })
  }

  const onSubmit = () => {
    setValidationLoading(true)
    const data = serialize(formData)
    validate(data)
    .then((response) => {
      setValidationLoading(false)
      setFormErrors({})
      setValidationResult({...response})
    })
    .catch(err => {
      setValidationLoading(false)
      setFormErrors(err.data || {})
    })
  }

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

  function serialize(values) {
    const newValues = {...values}

    if (newValues.indices){
      //if the user checks a set box, retrieve all the index children
      newValues.indices = newValues.indices.map(index => {
        //When an index is chosen value returned is [setID, indexID]
        if (index.length > 1)
          return index[1]
        //When a set is chosen you just get [setID]
        else
          return indicesBySet.find(set => {
            return set.value ===  index[0]
          }).children?.map(index => index.value)
      })
      newValues.indices = [].concat(...newValues.indices).join()
    }

    return newValues
  }

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push('/indices/list')}
      />
      <PageContent>
      { validationResult
        ?
          <div style={{marginBottom: '3rem'}}>
            <IndicesValidationResult validationResult={validationResult}/>
            <Button
              type="primary"
              htmlType="submit"
              style={{
                float:'right',
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
                options={instrumentTypes}
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
                  return(
                    <div>
                      {menus}
                      <Divider style={{ margin: 0 }} />
                      <Alert
                         style={{ padding: '5px', marginBottom:'-5px'}}
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
              rules={requiredRules}
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
              <Button
                type="primary"
                htmlType="submit"
                disabled={!allIndicesLoaded}
                loading={validationLoading}
                style={{float:'right', marginRight:'25rem'}}
              >
                Submit
              </Button>
          </Form>
      }
      </PageContent>
    </>
  );
}

export default connect(mapStateToProps, actionCreators)(IndicesValidate);
