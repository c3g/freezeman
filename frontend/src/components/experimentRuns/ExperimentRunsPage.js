import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import ExperimentRunsListContent from "./ExperimentRunsListContent";
import ExperimentRunsDetailContent from "./ExperimentRunsDetailContent";
import PageContainer from "../PageContainer";

const ExperimentRunsPage = () => <PageContainer>
  <Switch>
    <Route path="/experiment-runs/list"><ExperimentRunsListContent /></Route>
    <Route path="/experiment-runs/:id"><ExperimentRunsDetailContent /></Route>
    <Redirect to="/experiment-runs/list" />
  </Switch>
</PageContainer>;

export default ExperimentRunsPage;