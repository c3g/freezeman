import React from "react";
import {connect} from "react-redux";

const mapStateToProps = state => ({
  filters: state.containers.filters,
});


const Filters = ({
  options,
  multipleOptions,
  onChangeFunction,
  filters
}) => {
  const handleChange = (e) => {
    onChangeFunction(e.target.value)
    console.log(filters)
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