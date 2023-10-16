import React from 'react'
import PageContainer from '../PageContainer'
import { Navigate, Route, Routes } from 'react-router-dom'
import InstrumentListContent from './InstrumentListContent'
const InstrumentsRoute = () => {
    return (
        <PageContainer>
            <Routes>
                <Route path="/list/*" element={<InstrumentListContent />} />
                <Route path="*" element={<Navigate to="/instruments/list" replace />} />
            </Routes>
        </PageContainer>

    )
}

export default InstrumentsRoute