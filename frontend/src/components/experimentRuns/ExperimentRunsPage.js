import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import { ExperimentRunsDetailContentRoute } from "./ExperimentRunsDetailContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";
import { useAppDispatch } from "../../hooks";
import ExperimentRunsTabs from "./ExperimentRunsTabs";

const ExperimentRunsPage = () => { 

  const dispatch = useAppDispatch()

  return (
    <PageContainer>
      <Routes>
        <Route path="/list/*" element={<ExperimentRunsTabs />}/>
        <Route path="/actions/:action/*" element={<ActionContent templateType="experimentRun" />}/>
        <Route path="/:id/*" element={<ExperimentRunsDetailContentRoute />}/>
        <Route path="*" element={<Navigate to="/experiment-runs/list" replace />}/>
      </Routes>
  </PageContainer>
  )

}

export default ExperimentRunsPage;