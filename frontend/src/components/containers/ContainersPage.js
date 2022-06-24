import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";

import ContainerEditContent from "./ContainerEditContent";
import ContainersDetailContent from "./ContainersDetailContent";
import ContainersListContent from "./ContainersListContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ContainersPage = () => <PageContainer>
  <Routes>
    <Route path="/containers/list" element={<ContainersListContent />}/>
    <Route path="/containers/actions/:action" element={<ActionContent templateType="container" />}/>
    <Route path="/containers/add" element={<ContainerEditContent />}/>
    <Route path="/containers/:id/update" element={<ContainerEditContent />}/>
    <Route path="/containers/:id" element={<ContainersDetailContent />}/>
    <Navigate to="/containers/list" />
  </Routes>
</PageContainer>;

export default ContainersPage;
