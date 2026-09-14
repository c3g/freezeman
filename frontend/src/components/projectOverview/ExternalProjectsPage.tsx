import { Route, Routes } from "react-router-dom"
import PageContainer from "../PageContainer"
import ExternalProjectsListContent from "./ExternalProjectsListContent"
import ExternalProjectDetailsPage from "./ExternalProjectDetailsPage"

const ExternalProjectsPage = () => {
  return (
    <PageContainer>
      <Routes>
        <Route path="*" element={<ExternalProjectsListContent />} />
        <Route path="/:parentProjectId" element={<ExternalProjectDetailsPage />} />
      </Routes>
    </PageContainer>
  )
}

export default ExternalProjectsPage
