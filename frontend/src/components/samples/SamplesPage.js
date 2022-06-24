import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import SampleEditContent from "./SampleEditContent";
import SamplesDetailContent from "./details/SampleDetailsContent";
import SamplesListContent from "./SamplesListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const SamplesPage = () => <PageContainer>
  <Routes>
    <Route path="/samples/list" element={<SamplesListContent />}/>
    <Route path="/samples/actions/:action" element={<ActionContent templateType="sample" />}/>
    <Route path="/samples/add" element={<SampleEditContent />}/>
    <Route path="/samples/:id/update" element={<SampleEditContent />}/>
    <Route path="/samples/:id" element={<SamplesDetailContent />}/>
    <Navigate to="/samples/list" />
  </Routes>
</PageContainer>;

export default SamplesPage;
