import React from "react";
import { Redirect, Route, Switch } from "react-router-dom"
import PageContainer from "../PageContainer"
import DatasetDetailContent from "./DatasetDetailContent";
import DatasetsListContent from "./DatasetsListContent";

const DatasetsPage = () => <PageContainer>
    <Switch>
        <Route path="/datasets/list"><DatasetsListContent /></Route>
        <Route path="/datasets/:id"><DatasetDetailContent /></Route>
        <Redirect to="/datasets/list" />
    </Switch>
</PageContainer>;

export default DatasetsPage;