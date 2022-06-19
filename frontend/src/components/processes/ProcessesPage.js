import React from "react";

import {Navigate, Route, Switch} from "react-router-dom";

import ProcessDetailContent from "./ProcessDetailContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessesPage = () => <PageContainer>
  <Switch>
    <Route path="/processes/:id"><ProcessDetailContent /></Route>
    <Navigate to="/process-measurements/list" />
  </Switch>
</PageContainer>;

export default ProcessesPage;
