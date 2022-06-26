import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";

import IndividualEditContent from "./IndividualEditContent";
import IndividualsListContent from "./IndividualsListContent";
import IndividualsDetailContent from "./IndividualsDetailContent";
import PageContainer from "../PageContainer";

const IndividualsPage = () => <PageContainer>
    <Routes>
        <Route path="/list" element={<IndividualsListContent />}/>
        <Route path="/add" element={<IndividualEditContent />}/>
        <Route path="/:id/update" element={<IndividualEditContent />}/>
        <Route path="/:id" element={<IndividualsDetailContent />}/>
        <Route path="/" element={<Navigate to="/list" />}/>
    </Routes>
</PageContainer>;

export default IndividualsPage;
