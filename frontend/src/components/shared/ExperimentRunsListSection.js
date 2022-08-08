import React, { useEffect } from "react";
import {connect} from "react-redux";

import {List} from "antd";
import {Link} from "react-router-dom";
import {list as listExperimentRuns} from "../../modules/experimentRuns/actions";


const mapStateToProps = state => ({
  experimentRunsByID: state.experimentRuns.itemsByID,
  runTypesByID: state.runTypes.itemsByID,
  instrumentsByID: state.instruments.itemsByID,
});

const actionCreators = {};

const ExperimentRunsListSection = ({
  experimentRunsIDs,
  experimentRunsByID,
  runTypesByID,
  instrumentsByID,
}) => {
  const hasExperimentRuns = experimentRunsIDs.length
  const experimentRunsLoaded = hasExperimentRuns && experimentRunsByID[experimentRunsIDs[0]]
  const experimentRunsReady = experimentRunsIDs && (!hasExperimentRuns|| experimentRunsLoaded)
  let experimentRuns = []

  useEffect(() => {
    if (hasExperimentRuns && !experimentRunsLoaded)
      listExperimentRuns({id__in: experimentRunsIDs.join()})
  }, [hasExperimentRuns, experimentRunsLoaded, experimentRunsIDs])

  if (experimentRunsLoaded)
    experimentRuns = experimentRunsIDs?.map(erID => experimentRunsByID[erID])

  return (
    <>
        <List
          bordered
          dataSource={experimentRuns}
          loading={!experimentRunsReady}
          renderItem={experimentRun => (
            <List.Item key={experimentRun?.id?.toString()}>
              {`${experimentRun.start_date}  -  `}
              <Link to={`/experiment-runs/${experimentRun.id}`}>
                 {`[Experiment #${experimentRun.id}]  `}
              </Link>
              {runTypesByID[experimentRun.run_type]?.name}
              {` (${instrumentsByID[experimentRun.instrument]?.name})`}
            </List.Item>
          )}
        />
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsListSection);
