import React from "react";
import { Route, Routes, Navigate } from "react-router-dom"
import PageContainer from "../PageContainer"
import DatasetDetailContent from "./DatasetDetailContent";
import DatasetsListContent from "./DatasetsListContent";

const DatasetsPage = () => <PageContainer>
    <Routes>
        <Route path="/list/*" element={<DatasetsListContent />}/>
        <Route path="/:id/*" element={<DatasetDetailContent />} />
        <Route path="*" element={<Navigate to="/datasets/list" replace />} />
    </Routes>
</PageContainer>;

export default DatasetsPage;