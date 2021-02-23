import React, {useState} from "react";
import {AutoComplete} from "antd";

import filterAutocompleteOptions from "../../utils/filterAutocompleteOptions";

const autocompleteStyle = { width: "100%" };

const AutocompleteReport = ({ data, onSelect, searchKeys, renderItem }) => {
  const [value, setValue] = useState('');
  const [options, setOptions] = useState([]);

  const onSearch = searchText => {
    setOptions(getSearchOptions(searchText, data, searchKeys, renderItem));
  };

  const onChange = data => {
    setValue(data);
  };

  return (
    <>
      <AutoComplete
        style={autocompleteStyle}
        value={value}
        options={options}
        onSelect={onSelect}
        onSearch={onSearch}
        onChange={onChange}
        placeholder="Search"
      />
    </>
  );
};

function getSearchOptions(searchText, data, searchKeys, renderItem) {
  return filterAutocompleteOptions(searchText, data, searchKeys)
    .map(({ item }) => ({
      value: String(item.id),
      label: renderItem(item),
    }));
}

export default AutocompleteReport;
