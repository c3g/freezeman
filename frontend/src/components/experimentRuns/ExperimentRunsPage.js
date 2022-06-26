import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ExperimentRunsListContent from "./ExperimentRunsListContent";
import ExperimentRunsDetailContent from "./ExperimentRunsDetailContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ExperimentRunsPage = () => <PageContainer>
  <Routes>
    <Route path="/list" element={<ExperimentRunsListContent />}/>
    <Route path="/actions/:action" element={<ActionContent templateType="experimentRun" />}/>
    <Route path="/:id" element={<ExperimentRunsDetailContent />}/>
    <Route path="/" element={<Navigate to="/experiment-runs/list" />}/>
  </Routes>
</PageContainer>;

export default ExperimentRunsPage;