import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ProcessMeasurementsDetailContent from "./ProcessMeasurementsDetailContent";
import ProcessMeasurementsListContent from "./ProcessMeasurementsListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessMeasurementsPage = () => <PageContainer>
  <Routes>
    <Route path="/process-measurements/list" element={<ProcessMeasurementsListContent />}/>
    <Route path="/process-measurements/actions/:action" element={<ActionContent templateType="processMeasurement" />}/>
    <Route path="/process-measurements/:id" element={<ProcessMeasurementsDetailContent />}/>
    <Navigate to="/process-measurements/list" />
  </Routes>
</PageContainer>;

export default ProcessMeasurementsPage;