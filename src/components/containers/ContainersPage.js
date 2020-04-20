import React from "react";
import {Redirect, Route, Switch} from "react-router-dom";

import ContainersAddContent from "./ContainersAddContent";
import ContainersDetailContent from "./ContainersDetailContent";
import ContainersListContent from "./ContainersListContent";
import ContainersMoveContent from "./ContainersMoveContent";
import PageContainer from "../PageContainer";

const ContainersPage = () => <PageContainer>
    <Switch>
        <Route path="/containers/add"><ContainersAddContent /></Route>
        <Route path="/containers/move"><ContainersMoveContent /></Route>
        <Route path="/containers/list"><ContainersListContent /></Route>
        <Route path="/containers/:barcode"><ContainersDetailContent /></Route>
        <Redirect to="/containers/list" />
    </Switch>
</PageContainer>;

export default ContainersPage;
