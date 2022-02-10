import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import ProcessDetailContent from "./ProcessDetailContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessesPage = () => <PageContainer>
  <Switch>
    <Route path="/processes/:id"><ProcessDetailContent /></Route>
    <Redirect to="/process-measurements/list" />
  </Switch>
</PageContainer>;

export default ProcessesPage;
