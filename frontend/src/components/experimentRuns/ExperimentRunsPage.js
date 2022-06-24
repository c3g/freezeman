import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ExperimentRunsListContent from "./ExperimentRunsListContent";
import ExperimentRunsDetailContent from "./ExperimentRunsDetailContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ExperimentRunsPage = () => <PageContainer>
  <Routes>
    <Route path="/experiment-runs/list" element={<ExperimentRunsListContent />}/>
    <Route path="/experiment-runs/actions/:action" element={<ActionContent templateType="experimentRun" />}/>
    <Route path="/experiment-runs/:id" element={<ExperimentRunsDetailContent />}/>
    <Navigate to="/experiment-runs/list" />
  </Routes>
</PageContainer>;

export default ExperimentRunsPage;