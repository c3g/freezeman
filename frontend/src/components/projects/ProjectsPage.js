import React from "react";
import { useParams } from 'react-router-dom'

import {Navigate, Route, Routes} from "react-router-dom";

import ProjectsListContent from "./ProjectsListContent";
import ProjectEditContent from "./ProjectEditContent";
import ProjectsDetailedContent from "./ProjectsDetailedContent.tsx";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";
import StudyEditContent from "../studies/StudyEditContent";
import StudyDetails from "../studies/StudyDetails";

const ProjectsPage = () => {

  const { study_id} = useParams()

  return (
    <PageContainer>
      <Routes>
        <Route path="/list/*" element={<ProjectsListContent />}/>
        <Route path="/actions/:action/*" element={<ActionContent templateType="project" />}/>
        <Route path="/add/*" element={<ProjectEditContent />}/>
        <Route path="/:id/update/*" element={<ProjectEditContent />}/>
        <Route path="/:id/*" element={<ProjectsDetailedContent/>}/>
        <Route path="/:id/study/add/*" element={<StudyEditContent action="ADD"/>}/>
        <Route path="/:id/study/:study_id/update" element={<StudyEditContent action="EDIT"/>}/>
        <Route path="/:id/study/:study_id/*" element={<StudyDetails studyId={study_id}/>}/>
        <Route path="*" element={<Navigate to="/projects/list" replace />}/>
      </Routes>
    </PageContainer>
  )
};

export default ProjectsPage;
