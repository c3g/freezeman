import React from "react";
import {Redirect, Route, Switch} from "react-router-dom";

import ContainersAddContent from "./ContainersAddContent";
import ContainersListContent from "./ContainersListContent";
import ContainersMoveContent from "./ContainersMoveContent";

const ContainersPage = () => (
    <div style={{height: "100%", backgroundColor: "white", overflowY: "auto"}}>
        <Switch>
            <Route path="/containers/add"><ContainersAddContent /></Route>
            <Route path="/containers/move"><ContainersMoveContent /></Route>
            <Route path="/containers/list"><ContainersListContent /></Route>
            <Redirect to="/containers/list" />
        </Switch>
    </div>
);

export default ContainersPage;
