import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import SampleEditContent from "./SampleEditContent";
import SamplesDetailContent from "./details/SampleDetailsContent";
import SamplesListContent from "./SamplesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const SamplesPage = () => <PageContainer>
  <Routes>
    <Route path="/list/*" element={<SamplesListContent />}/>
    <Route path="/actions/:action/*" element={<ActionContent templateType="sample" />}/>
    <Route path="/add/*" element={<SampleEditContent />}/>
    <Route path="/:id/update/*" element={<SampleEditContent />}/>
    <Route path="/:id/*" element={<SamplesDetailContent />}/>
    <Route path="*" element={<Navigate to="/samples/list" replace />}/>
  </Routes>
</PageContainer>;

export default SamplesPage;
