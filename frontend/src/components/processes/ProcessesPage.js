import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import ProcessesDetailContent from "./ProcessesDetailContent";
import ProcessesListContent from "./ProcessesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProcessesPage = () => <PageContainer>
  <Switch>
    <Route path="/processes/list"><ProcessesListContent /></Route>
    <Route path="/processes/actions/:action"><ActionContent templateType="process" /></Route>
    <Route path="/processes/:id"><ProcessesDetailContent /></Route>
    <Redirect to="/processes/list" />
  </Switch>
</PageContainer>;

export default ProcessesPage;