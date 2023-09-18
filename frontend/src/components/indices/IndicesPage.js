import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import IndicesListContent from "./IndicesListContent2";
import IndicesDetailedContent from "./IndicesDetailedContent";
import IndicesValidate from "./IndicesValidate";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const IndicesPage = () => <PageContainer>
  <Routes>
    <Route path="/list" element={<IndicesListContent />}/>
    <Route path="/actions/:action" element={<ActionContent templateType="index" />}/>
    <Route path="/validate" element={<IndicesValidate/>}/>
    <Route path="/:id" element={<IndicesDetailedContent/>}/>
    <Route path="*" element={<Navigate to="/indices/list" replace />}/>
  </Routes>
</PageContainer>;

export default IndicesPage;
