import React from "react";
import {Redirect, Route, Switch} from "react-router-dom";

import IndividualsListContent from "./IndividualsListContent";
import IndividualsDetailContent from "./IndividualsDetailContent";
import PageContainer from "../PageContainer";

const IndividualsPage = () => <PageContainer>
    <Switch>
        <Route path="/individuals/list"><IndividualsListContent /></Route>
        <Route path="/individuals/:name"><IndividualsDetailContent /></Route>
        <Redirect to="/individuals/list" />
    </Switch>
</PageContainer>;

export default IndividualsPage;
