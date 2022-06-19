import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import SampleEditContent from "./SampleEditContent";
import SamplesDetailContent from "./details/SampleDetailsContent";
import SamplesListContent from "./SamplesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const SamplesPage = () => <PageContainer>
  <Routes>
    <Route path="/samples/list"><SamplesListContent /></Route>
    <Route path="/samples/actions/:action"><ActionContent templateType="sample" /></Route>
    <Route path="/samples/add"><SampleEditContent /></Route>
    <Route path="/samples/:id/update"><SampleEditContent /></Route>
    <Route path="/samples/:id"><SamplesDetailContent /></Route>
    <Navigate to="/samples/list" />
  </Routes>
</PageContainer>;

export default SamplesPage;
