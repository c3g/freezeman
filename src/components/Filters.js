import React from "react";
import {connect} from "react-redux";

const mapStateToProps = state => ({
  filters: state.containers.filters,
});


const Filters = ({
  options,
  multipleOptions,
  onChange,
  filters
}) => {

  const handleChange = (e) => {
    const key = 'containerKind'
    const value = e.target.value
    onChange(key, value)
  }

  return <>
    <div>
      <select id="toggleLocationName"  multiple={multipleOptions} onChange={handleChange}>
        <option key="all" value="">All</option>
        {
          options.map((item, index) =>
          <option key={index} value={item}>{[item]}</option>
        )
        }
      </select>

    </div>
  </>;
};

export default connect(mapStateToProps, null)(Filters);
