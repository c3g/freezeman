import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import IndicesListContent from "./IndicesListContent";
import IndicesDetailedContent from "./IndicesDetailedContent";
import IndicesValidate from "./IndicesValidate";
import IndicesValidationResult from "./IndicesValidationResult";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const IndicesPage = () => <PageContainer>
  <Routes>
    <Route path="/indices/list" element={<IndicesListContent />}/>
    <Route path="/indices/actions/:action" element={<ActionContent templateType="index" />}/>
    <Route path="/indices/validate" element={<IndicesValidate/>}/>
    <Route path="/indices/:id" element={<IndicesDetailedContent/>}/>
    <Navigate to="/indices/list" />
  </Routes>
</PageContainer>;

export default IndicesPage;
