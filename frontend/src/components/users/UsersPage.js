import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";

import UserEditContent from "./UserEditContent";
import UsersDetailContent from "./UsersDetailContent";
import UsersListContent from "./UsersListContent";
import PageContainer from "../PageContainer";

const UsersPage = () => <PageContainer>
  <Routes>
    <Route path="/list/*" element={<UsersListContent />}/>
    <Route path="/add/*" element={<UserEditContent />}/>
    <Route path="/:id/update/*" element={<UserEditContent />}/>
    <Route path="/:id/*" element={<UsersDetailContent />}/>
    <Route path="*" element={<Navigate to="/users/list" replace />}/>
  </Routes>
</PageContainer>;

export default UsersPage;
