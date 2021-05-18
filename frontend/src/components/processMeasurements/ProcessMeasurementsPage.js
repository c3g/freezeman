import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import ProcessMeasurementsDetailContent from "./ProcessMeasurementsDetailContent";
import ProcessMeasurementsListContent from "./ProcessMeasurementsListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessMeasurementsPage = () => <PageContainer>
  <Switch>
    <Route path="/processes/list"><ProcessMeasurementsListContent /></Route>
    <Route path="/processes/actions/:action"><ActionContent templateType="processMeasurement" /></Route>
    <Route path="/processes/:id"><ProcessMeasurementsDetailContent /></Route>
    <Redirect to="/processes/list" />
  </Switch>
</PageContainer>;

export default ProcessMeasurementsPage;