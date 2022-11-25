import React, {useState} from "react";
import { connect } from "react-redux";
import {Radio, Select, Input} from "antd";

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
 const handleValueChange = ev => {
   value = typeof ev === 'string' ? ev : ev.target.value
   onChange(item, value, options = { metadataName: metadataName})
 }

 return (
   <div style={style.metadata}>
     <div style={{display: 'grid', marginTop: '5px'}}>
       <FilterLabel> Metadata Name </FilterLabel>
       <Select
         size='small'
         style={{ width: 200 }}
         placeholder={item.placeholder}
         showSearch
         allowClear
         filterOption={false}
         options={metadataOptions}
         onSearch={onSearchMetadata}
         onFocus={onFocusMetadata}
         onChange={onNameChange}
         value={metadataName}
       />
     </div>

     <div style={{marginLeft: '5px'}}>
       <FilterLabel> Metadata Value </FilterLabel>
       <Input.Group style={style.element} compact>
         <Input
           size='small'
           value={value}
           onChange={handleValueChange}
         />
       </Input.Group>
     </div>
   </div>
 );
};

export default connect(mapStateToProps)(FilterMetadata);
