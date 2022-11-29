import React, {useState} from "react";
import { connect } from "react-redux";
import {Radio, Select, Input, Form, Button, Space} from "antd";
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

import FilterLabel from "./FilterLabel"
import * as style from "./style"

import api, { withToken } from "../../../utils/api";
import * as Options from "../../../utils/options";

const { Option } = Select;

const EMPTY_VALUE = '__FILTER_SELECT_EMPTY_VALUE__'

const searchMetadata = (token, input, options) =>
  withToken(token, api.sampleMetadata.search)(input, options).then(res => res.data)

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
});

const FilterMetadata = ({
 token,
 item,
 name,
 value,
 options,
 onChange,
}) => {
 const [metadataName, setMetadataName] = useState([]);

 const [metadataOptions, setMetadataOptions] = useState([]);
 const onFocusMetadata = ev => { onSearchMetadata(ev.target.value) }
 const onSearchMetadata = (input, options) => {
   searchMetadata(token, input, options).then(metadata => {
     setMetadataOptions(metadata.map(Options.renderMetadata))
   })
 }

 //Metadata Name
 const onNameChange = (name) => {
    setMetadataName(name);
  };

 //Property Value, which applies the filter
  const onApplyFilter = (values) => {
    onChange(item, values.fields)
  }

 return (
   <div style={style.metadata}>
    <Form name="dynamic_form_nest_item" autoComplete="off" onFinish={onApplyFilter}>
      <div style={{display: 'grid', marginTop: '5px', minWidth:'200px'}}>
        <FilterLabel> Metadata Filter </FilterLabel>
        <Form.List name="fields">
         {(fields, { add, remove }) => (
           <>
             {fields.map(({ key, name, ...restField }) => (
               <Space key={key} style={{ display: 'flex', marginBottom: '-5px' }} align="baseline">
                 <Form.Item
                   {...restField}
                   name={[name, 'name']}
                   rules={[{ required: true, message: 'Missing name' }]}
                 >
                   <Select
                     size='small'
                     style={{ width: 150 }}
                     placeholder="Name"
                     showSearch
                     allowClear
                     filterOption={false}
                     options={metadataOptions}
                     onSearch={onSearchMetadata}
                     onFocus={onFocusMetadata}
                     onChange={onNameChange}
                     value={metadataName}
                   />
                 </Form.Item>
                 <Form.Item
                   {...restField}
                   name={[name, 'value']}
                   rules={[{ required: true, message: 'Missing value' }]}
                 >
                   <Input  size='small' placeholder="Value" />
                 </Form.Item>
                 <MinusCircleOutlined onClick={() => remove(name)} />
               </Space>
             ))}
             <Form.Item style={{marginBottom: '5px'}}>
               <Button size='small' type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                 Add metadata field
               </Button>
             </Form.Item>
           </>
         )}
        </Form.List>
        <Form.Item style={{marginBottom: '5px'}}>
          <Button size="small" type="primary" htmlType="submit">
            Apply Filter
          </Button>
        </Form.Item>
     </div>
    </Form>
   </div>
 );
};

export default connect(mapStateToProps)(FilterMetadata);
