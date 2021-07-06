import React from "react";
import {connect} from "react-redux";

import {List} from "antd";
import {Link} from "react-router-dom";
import {list as listExperimentRuns} from "../../modules/experimentRuns/actions";


const mapStateToProps = state => ({
  experimentRunsByID: state.experimentRuns.itemsByID,
  experimentTypesByID: state.experimentTypes.itemsByID,
  instrumentsByID: state.instruments.itemsByID,
});

const actionCreators = {};

const ExperimentRunsListSection = ({
  experimentRunsIDs,
  experimentRunsByID,
  experimentTypesByID,
  instrumentsByID,
}) => {
  const hasExperimentRuns = experimentRunsIDs.length
  const experimentRunsLoaded = hasExperimentRuns && experimentRunsByID[experimentRunsIDs[0]]
  const experimentRunsReady = experimentRunsIDs && (!hasExperimentRuns|| experimentRunsLoaded)
  let experimentRuns = []

  if (hasExperimentRuns && !experimentRunsLoaded)
    listExperimentRuns({id__in: experimentRunsIDs.join()})

  if (experimentRunsLoaded)
    experimentRuns = experimentRunsIDs?.map(erID => experimentRunsByID[erID])

  return (
    <>
        <List
          bordered
          dataSource={experimentRuns}
          loading={!experimentRunsReady}
          renderItem={experimentRun => (
            <List.Item>
              {`${experimentRun.start_date}  -  `}
              <Link to={`/experiment-runs/${experimentRun.id}`}>
                 {`[Experiment #${experimentRun.id}]  `}
              </Link>
              {experimentTypesByID[experimentRun.experiment_type]?.workflow}
              {` (${instrumentsByID[experimentRun.instrument]?.name})`}
            </List.Item>
          )}
        />
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsListSection);
