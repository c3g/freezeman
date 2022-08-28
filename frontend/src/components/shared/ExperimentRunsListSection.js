import { useDispatch, useSelector } from "react-redux"
import React from "react";
import {connect} from "react-redux";

import {List} from "antd";
import {Link} from "react-router-dom";
import {list as listExperimentRuns} from "../../modules/experimentRuns/actions";






const ExperimentRunsListSection = ({ experimentRunsIDs }) => {
  const experimentRunsByID = useSelector((state) => state.experimentRuns.itemsByID)
  const runTypesByID = useSelector((state) => state.runTypes.itemsByID)
  const instrumentsByID = useSelector((state) => state.instruments.itemsByID)
  const dispatch = useDispatch()

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
              {runTypesByID[experimentRun.run_type]?.name}
              {` (${instrumentsByID[experimentRun.instrument]?.name})`}
            </List.Item>
          )}
        />
    </>
  );
};

export default ExperimentRunsListSection;
