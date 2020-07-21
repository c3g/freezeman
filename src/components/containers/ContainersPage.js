import React from "react";
import {Redirect, Route, Switch} from "react-router-dom";

import ContainersDetailContent from "./ContainersDetailContent";
import ContainersListContent from "./ContainersListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ContainersPage = () => <PageContainer>
  <Switch>
    <Route path="/containers/list"><ContainersListContent /></Route>
    <Route path="/containers/actions/:action"><ActionContent templateType="container" /></Route>
    <Route path="/containers/:barcode"><ContainersDetailContent /></Route>
    <Redirect to="/containers/list" />
  </Switch>
</PageContainer>;

export default ContainersPage;
