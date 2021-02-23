import React from "react";
import {Redirect, Route, Switch} from "react-router-dom";

import UserEditContent from "./UserEditContent";
import UsersDetailContent from "./UsersDetailContent";
import UsersListContent from "./UsersListContent";
import PageContainer from "../PageContainer";

const UsersPage = () => <PageContainer>
  <Switch>
    <Route path="/users/list"><UsersListContent /></Route>
    <Route path="/users/add"><UserEditContent /></Route>
    <Route path="/users/:id/update"><UserEditContent /></Route>
    <Route path="/users/:id"><UsersDetailContent /></Route>
    <Redirect to="/users/list" />
  </Switch>
</PageContainer>;

export default UsersPage;
