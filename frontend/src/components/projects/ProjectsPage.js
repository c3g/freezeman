import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ProjectsListContent from "./ProjectsListContent";
import ProjectEditContent from "./ProjectEditContent";
import ProjectsDetailedContent from "./ProjectsDetailedContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProjectsPage = () => <PageContainer>
  <Routes>
    <Route path="/list/*" element={<ProjectsListContent />}/>
    <Route path="/actions/:action/*" element={<ActionContent templateType="project" />}/>
    <Route path="/add/*" element={<ProjectEditContent />}/>
    <Route path="/:id/update/*" element={<ProjectEditContent />}/>
    <Route path="/:id/*" element={<ProjectsDetailedContent/>}/>
    <Route path="*" element={<Navigate to="/projects/list" replace />}/>
  </Routes>
</PageContainer>;

export default ProjectsPage;
