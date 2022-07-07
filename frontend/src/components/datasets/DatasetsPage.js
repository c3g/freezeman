import React from "react";
import { Redirect, Route, Switch } from "react-router-dom"
import PageContainer from "../PageContainer"
import DatasetsListContent from "./DatasetsListContent";

const DatasetsPage = () => <PageContainer>
    <Switch>
        <Route path="/datasets/list"><DatasetsListContent /></Route>
        <Redirect to="/datasets/list" />
    </Switch>
</PageContainer>;

export default DatasetsPage;