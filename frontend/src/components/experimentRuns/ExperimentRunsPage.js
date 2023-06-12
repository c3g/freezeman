import React from "react";

import { Navigate, Route, Routes } from "react-router-dom";

import ActionContent from "../ActionContent";
import PageContainer from "../PageContainer";
import { ExperimentRunsDetailContentRoute } from "./ExperimentRunsDetailContent";
import ExperimentRunsTabs from "./ExperimentRunsTabs";
import ExternalExperimentRunDetailContentRoute from "./ExternalExperimentRunDetailContent";

const ExperimentRunsPage = () => { 
  return (
    <PageContainer>
      <Routes>
        <Route path="/list/*" element={<ExperimentRunsTabs />}/>
        <Route path="/actions/:action/*" element={<ActionContent templateType="experimentRun" />}/>
        <Route path="/:id/*" element={<ExperimentRunsDetailContentRoute />}/>
        <Route path="/external/:name/*" element={<ExternalExperimentRunDetailContentRoute/>}/>
        <Route path="*" element={<Navigate to="/experiment-runs/list" replace />}/>
      </Routes>
  </PageContainer>
  )

}

export default ExperimentRunsPage;