import { Navigate, Route, Routes } from "react-router-dom"
import PageContainer from "../PageContainer"
import ExternalProjectsListContent from "./ExternalProjectsListContent"
import ExternalProjectDetailsPage from "./ExternalProjectDetailsPage"

export const ROUTE = "/external-projects" as const

const ExternalProjectsPage = () => {
  return (
    <PageContainer>
      <Routes>
        <Route index element={<ExternalProjectsListContent />} />
        <Route path="/:parentProjectId" element={<ExternalProjectDetailsPage />} />
        <Route path="*" element={<Navigate to={`${ROUTE}/`} replace />}/>
      </Routes>
    </PageContainer>
  )
}

export default ExternalProjectsPage
