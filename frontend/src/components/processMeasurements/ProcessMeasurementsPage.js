import React from "react";

import {Navigate, Route, Switch} from "react-router-dom";

import ProcessMeasurementsDetailContent from "./ProcessMeasurementsDetailContent";
import ProcessMeasurementsListContent from "./ProcessMeasurementsListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessMeasurementsPage = () => <PageContainer>
  <Switch>
    <Route path="/process-measurements/list"><ProcessMeasurementsListContent /></Route>
    <Route path="/process-measurements/actions/:action"><ActionContent templateType="processMeasurement" /></Route>
    <Route path="/process-measurements/:id"><ProcessMeasurementsDetailContent /></Route>
    <Navigate to="/process-measurements/list" />
  </Switch>
</PageContainer>;

export default ProcessMeasurementsPage;