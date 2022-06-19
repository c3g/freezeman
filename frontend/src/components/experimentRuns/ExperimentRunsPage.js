import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ExperimentRunsListContent from "./ExperimentRunsListContent";
import ExperimentRunsDetailContent from "./ExperimentRunsDetailContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ExperimentRunsPage = () => <PageContainer>
  <Routes>
    <Route path="/experiment-runs/list"><ExperimentRunsListContent /></Route>
    <Route path="/experiment-runs/actions/:action"><ActionContent templateType="experimentRun" /></Route>
    <Route path="/experiment-runs/:id"><ExperimentRunsDetailContent /></Route>
    <Navigate to="/experiment-runs/list" />
  </Routes>
</PageContainer>;

export default ExperimentRunsPage;