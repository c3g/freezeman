import React from "react";

import {Navigate, Route, Switch} from "react-router-dom";

import ProjectsListContent from "./ProjectsListContent";
import ProjectEditContent from "./ProjectEditContent";
import ProjectsDetailedContent from "./ProjectsDetailedContent";
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";

const ProjectsPage = () => <PageContainer>
  <Switch>
    <Route path="/projects/list"><ProjectsListContent /></Route>
    <Route path="/projects/actions/:action"><ActionContent templateType="project" /></Route>
    <Route path="/projects/add"><ProjectEditContent /></Route>
    <Route path="/projects/:id/update"><ProjectEditContent /></Route>
    <Route path="/projects/:id"><ProjectsDetailedContent/></Route>
    <Navigate to="/projects/list" />
  </Switch>
</PageContainer>;

export default ProjectsPage;
