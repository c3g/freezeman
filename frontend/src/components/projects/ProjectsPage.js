import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ProjectsListContent from "./ProjectsListContent";
import ProjectEditContent from "./ProjectEditContent";
import ProjectsDetailedContent from "./ProjectsDetailedContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProjectsPage = () => <PageContainer>
  <Routes>
    <Route path="/projects/list" element={<ProjectsListContent />}/>
    <Route path="/projects/actions/:action" element={<ActionContent templateType="project" />}/>
    <Route path="/projects/add" element={<ProjectEditContent />}/>
    <Route path="/projects/:id/update" element={<ProjectEditContent />}/>
    <Route path="/projects/:id" element={<ProjectsDetailedContent/>}/>
    <Navigate to="/projects/list" />
  </Routes>
</PageContainer>;

export default ProjectsPage;
