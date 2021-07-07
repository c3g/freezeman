import React from "react";
import {connect} from "react-redux";

import {Table, Typography} from "antd";
import {withSample} from "../../utils/withItem";
import {Link} from "react-router-dom";
const {Title} = Typography;

import {get} from "../../modules/containers/actions";

const mapStateToProps = state => ({
  containersByID: state.containers.itemsByID,
  samplesByID: state.samples.itemsByID,
});

const actionCreators = {};

const ExperimentRunsSamples = ({
  containerID,
  containersByID,
  samplesByID,
}) => {
  let samplesIDS = undefined
  const container = containersByID[containerID]
  const isLoaded = containersByID[containerID]&& container.isLoaded;

  if (!isLoaded)
    get(containerID);

  if (isLoaded)
    samplesIDS = container.samples


  return (
    <>
      { samplesIDS && samplesIDS.map(sampleId => {
        const id = withSample(samplesByID, sampleId, sample => sample.id, 'Loading...')
        const sample = samplesByID[id]
        return <>
          {sample &&
            <Link to={`/samples/${sampleId}`}> Sample </Link>

          }
        </>
      })}
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsSamples);