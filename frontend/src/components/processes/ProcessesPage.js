import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ProcessDetailContent from "./ProcessDetailContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessesPage = () => <PageContainer>
  <Routes>
    <Route path="/:id/*" element={<ProcessDetailContent />}/>
    <Route path="*" element={<Navigate to="/process-measurements/list" replace />}/>
  </Routes>
</PageContainer>;

export default ProcessesPage;
