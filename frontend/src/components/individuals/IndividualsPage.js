import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";

import IndividualEditContent from "./IndividualEditContent";
import IndividualsListContent from "./IndividualsListContent";
import IndividualsDetailContent from "./IndividualsDetailContent";
import PageContainer from "../PageContainer";

const IndividualsPage = () => <PageContainer>
    <Routes>
        <Route path="/individuals/list" element={<IndividualsListContent />}/>
        <Route path="/individuals/add" element={<IndividualEditContent />}/>
        <Route path="/individuals/:id/update" element={<IndividualEditContent />}/>
        <Route path="/individuals/:id" element={<IndividualsDetailContent />}/>
        <Navigate to="/individuals/list" />
    </Routes>
</PageContainer>;

export default IndividualsPage;
