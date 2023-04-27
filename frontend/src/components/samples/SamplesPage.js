import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import { AddSampleRoute, EditSampleRoute } from "./SampleEditContent";
import SamplesDetailContent from "./details/SampleDetailsContent";
import SamplesListContent from "./SamplesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const SamplesPage = () => <PageContainer>
  <Routes>
    <Route path="/list/*" element={<SamplesListContent />}/>
    <Route path="/actions/:action/*" element={<ActionContent templateType="sample" />}/>
    <Route path="/add/*" element={<AddSampleRoute />}/>
    <Route path="/:id/update/*" element={<EditSampleRoute />}/>
    <Route path="/:id/*" element={<SamplesDetailContent />}/>
    <Route path="*" element={<Navigate to="/samples/list" replace />}/>
  </Routes>
</PageContainer>;

export default SamplesPage;
