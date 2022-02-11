import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import IndicesListContent from "./IndicesListContent";
import IndicesDetailedContent from "./IndicesDetailedContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const IndicesPage = () => <PageContainer>
  <Switch>
    <Route path="/indices/list"><IndicesListContent /></Route>
    <Route path="/indices/actions/:action"><ActionContent templateType="index" /></Route>
    <Route path="/indices/:id"><IndicesDetailedContent/></Route>
    <Redirect to="/indices/list" />
  </Switch>
</PageContainer>;

export default IndicesPage;
