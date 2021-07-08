import React from "react";
import {connect} from "react-redux";

import {Table, Typography} from "antd";
import {withSample} from "../../utils/withItem";
import {Link} from "react-router-dom";
const {Title} = Typography;


const mapStateToProps = state => ({
  samplesByID: state.samples.itemsByID,
});

const actionCreators = {};

const ExperimentRunsSamples = ({
  container,
  samplesByID,
}) => {

  return (
    <>
      { container && container.samples.map(sampleId => {
        const id = withSample(samplesByID, sampleId, sample => sample.id, 'Loading...')
        const sample = samplesByID[id]
        return <>
          {sample &&
            <Link to={`/samples/${sampleId}`}> Sample {sample.name} </Link>

          }
        </>
      })}
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsSamples);