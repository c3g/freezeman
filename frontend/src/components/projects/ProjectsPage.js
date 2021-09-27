import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import ProjectsListContent from "./ProjectsListContent";
import ProjectEditContent from "./ProjectEditContent";
import ProjectsDetailedContent from "./ProjectsDetailedContent";
import PageContainer from "../PageContainer";

const ProjectsPage = () => <PageContainer>
  <Switch>
    <Route path="/projects/list"><ProjectsListContent /></Route>
    <Route path="/projects/add"><ProjectEditContent /></Route>
    <Route path="/projects/:id/update"><ProjectEditContent /></Route>
    <Route path="/projects/:id"><ProjectsDetailedContent/></Route>
    <Redirect to="/projects/list" />
  </Switch>
</PageContainer>;

export default ProjectsPage;
