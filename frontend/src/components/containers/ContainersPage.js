import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";

import ContainerEditContent from "./ContainerEditContent";
import ContainersDetailContent from "./ContainersDetailContent";
import ContainersListContent from "./ContainersListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ContainersPage = () => <PageContainer>
  <Routes>
    <Route path="/containers/list"><ContainersListContent /></Route>
    <Route path="/containers/actions/:action"><ActionContent templateType="container" /></Route>
    <Route path="/containers/add"><ContainerEditContent /></Route>
    <Route path="/containers/:id/update"><ContainerEditContent /></Route>
    <Route path="/containers/:id"><ContainersDetailContent /></Route>
    <Navigate to="/containers/list" />
  </Routes>
</PageContainer>;

export default ContainersPage;
