import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";

import IndividualEditContent from "./IndividualEditContent";
import IndividualsListContent from "./IndividualsListContent";
import IndividualsDetailContent from "./IndividualsDetailContent";
import PageContainer from "../PageContainer";

const IndividualsPage = () => <PageContainer>
    <Routes>
        <Route path="/individuals/list"><IndividualsListContent /></Route>
        <Route path="/individuals/add"><IndividualEditContent /></Route>
        <Route path="/individuals/:id/update"><IndividualEditContent /></Route>
        <Route path="/individuals/:id"><IndividualsDetailContent /></Route>
        <Navigate to="/individuals/list" />
    </Routes>
</PageContainer>;

export default IndividualsPage;
