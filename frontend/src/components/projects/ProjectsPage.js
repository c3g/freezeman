import React from "react";

import {Navigate, Route, Routes} from "react-router-dom";

import ProjectsListContent from "./ProjectsListContent";
import ProjectEditContent from "./ProjectEditContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";
import StudyEditContent from "../studies/StudyEditContent";
import ProjectsDetailedContentRoute from "./ProjectsDetailedContent";

const ProjectsPage = () => {
  return (
    <PageContainer>
      <Routes>
        <Route path="/list/*" element={<ProjectsListContent />}/>
        <Route path="/actions/:action/*" element={<ActionContent templateType="project" />}/>
        <Route path="/add/*" element={<ProjectEditContent />}/>
        <Route path="/:id/update/*" element={<ProjectEditContent />}/>
        <Route path="/:id/*" element={<ProjectsDetailedContentRoute/>}/>
        <Route path="/:id/study/add/*" element={<StudyEditContent action="ADD"/>}/>
        <Route path="/:id/study/:study_id/update" element={<StudyEditContent action="EDIT"/>}/>
        <Route path="*" element={<Navigate to="/projects/list" replace />}/>
      </Routes>
    </PageContainer>
  )
};

export default ProjectsPage;
