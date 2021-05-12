import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import ProcessesSamplesDetailContent from "./ProcessesSamplesDetailContent";
import ProcessesSamplesListContent from "./ProcessesSamplesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessesSamplesPage = () => <PageContainer>
  <Switch>
    <Route path="/processes-samples/list"><ProcessesSamplesListContent /></Route>
    <Route path="/processes-samples/actions/:action"><ActionContent templateType="processSample" /></Route>
    <Route path="/processes-samples/:id"><ProcessesSamplesDetailContent /></Route>
    <Redirect to="/processes-samples/list" />
  </Switch>
</PageContainer>;

export default ProcessesSamplesPage;