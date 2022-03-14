import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import SamplesListContent from "./SamplesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const LibrariesPage = () => <PageContainer>
  <Switch>
    <Route path="/libraries/list"><LibrariesListContent /></Route>
    <Route path="/libraries/actions/:action"><ActionContent templateType="library" /></Route>
    <Redirect to="/libraries/list" />
  </Switch>
</PageContainer>;

export default SamplesPage;