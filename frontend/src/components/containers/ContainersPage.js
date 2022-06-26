import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";

import ContainerEditContent from "./ContainerEditContent";
import ContainersDetailContent from "./ContainersDetailContent";
import ContainersListContent from "./ContainersListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ContainersPage = () => <PageContainer>
  <Routes>
    <Route path="/list" element={<ContainersListContent />}/>
    <Route path="/actions/:action" element={<ActionContent templateType="container" />}/>
    <Route path="/add" element={<ContainerEditContent />}/>
    <Route path="/:id/update" element={<ContainerEditContent />}/>
    <Route path="/:id" element={<ContainersDetailContent />}/>
    <Route path="/" element={<Navigate to="/list" />}/>
  </Routes>
</PageContainer>;

export default ContainersPage;
