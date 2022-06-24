import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";

import UserEditContent from "./UserEditContent";
import UsersDetailContent from "./UsersDetailContent";
import UsersListContent from "./UsersListContent";
import PageContainer from "../PageContainer";

const UsersPage = () => <PageContainer>
  <Routes>
    <Route path="/users/list" element={<UsersListContent />}/>
    <Route path="/users/add" element={<UserEditContent />}/>
    <Route path="/users/:id/update" element={<UserEditContent />}/>
    <Route path="/users/:id" element={<UsersDetailContent />}/>
    <Navigate to="/users/list" />
  </Routes>
</PageContainer>;

export default UsersPage;
