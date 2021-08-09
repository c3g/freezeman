import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import ProjectsListContent from "./ProjectsListContent";
import ProjectEditContent from "./ProjectEditContent";
import PageContainer from "../PageContainer";

const ProjectsPage = () => <PageContainer>
  <Switch>
    <Route path="/projects/list"><ProjectsListContent /></Route>
    <Route path="/projects/add"><ProjectEditContent /></Route>
    <Redirect to="/projects/list" />
  </Switch>
</PageContainer>;

export default ProjectsPage;
