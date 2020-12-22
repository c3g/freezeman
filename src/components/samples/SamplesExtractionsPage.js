import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import SampleEditContent from "./SampleEditContent";
import SamplesDetailContent from "./SamplesDetailContent";
import SamplesListContent from "./SamplesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const SamplesExtractionsPage = () => <PageContainer>
  <Switch>
    <Route path="/samples/list"><SamplesListContent /></Route>
    <Route path="/samples/actions/:action"><ActionContent templateType="sample" /></Route>
    <Route path="/samples/add"><SampleEditContent /></Route>
    <Route path="/samples/:id/update"><SampleEditContent /></Route>
    <Route path="/samples/:id"><SamplesDetailContent /></Route>
    <Redirect to="/samples/list" />
  </Switch>
</PageContainer>;

export default SamplesExtractionsPage;
