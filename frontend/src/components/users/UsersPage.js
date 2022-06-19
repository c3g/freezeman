import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";

import UserEditContent from "./UserEditContent";
import UsersDetailContent from "./UsersDetailContent";
import UsersListContent from "./UsersListContent";
import PageContainer from "../PageContainer";

const UsersPage = () => <PageContainer>
  <Routes>
    <Route path="/users/list"><UsersListContent /></Route>
    <Route path="/users/add"><UserEditContent /></Route>
    <Route path="/users/:id/update"><UserEditContent /></Route>
    <Route path="/users/:id"><UsersDetailContent /></Route>
    <Navigate to="/users/list" />
  </Routes>
</PageContainer>;

export default UsersPage;
