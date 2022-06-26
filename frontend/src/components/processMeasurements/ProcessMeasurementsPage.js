import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ProcessMeasurementsDetailContent from "./ProcessMeasurementsDetailContent";
import ProcessMeasurementsListContent from "./ProcessMeasurementsListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessMeasurementsPage = () => <PageContainer>
  <Routes>
    <Route path="/list" element={<ProcessMeasurementsListContent />}/>
    <Route path="/actions/:action" element={<ActionContent templateType="processMeasurement" />}/>
    <Route path="/:id" element={<ProcessMeasurementsDetailContent />}/>
    <Navigate to="/process-measurements/list" />
  </Routes>
</PageContainer>;

export default ProcessMeasurementsPage;