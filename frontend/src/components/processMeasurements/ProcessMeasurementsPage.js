import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ProcessMeasurementsDetailContent from "./ProcessMeasurementsDetailContent";
import ProcessMeasurementsListContent from "./ProcessMeasurementsListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessMeasurementsPage = () => <PageContainer>
  <Routes>
    <Route path="/process-measurements/list"><ProcessMeasurementsListContent /></Route>
    <Route path="/process-measurements/actions/:action"><ActionContent templateType="processMeasurement" /></Route>
    <Route path="/process-measurements/:id"><ProcessMeasurementsDetailContent /></Route>
    <Navigate to="/process-measurements/list" />
  </Routes>
</PageContainer>;

export default ProcessMeasurementsPage;