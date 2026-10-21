import { Alert, Descriptions, Tabs } from "antd"

import React, { useCallback, useState, useEffect, useMemo } from "react"

import useHashURL from "../../hooks/useHashURL"
import AppPageHeader from "../AppPageHeader"
import EditButton from "../EditButton"
import PageContent from "../PageContent"
import TrackingFieldsContent from "../TrackingFieldsContent"

import ProjectSubmissionsTab from "./ProjectSubmissionsTab"
import ProjectReadSetsTab from "./ProjectReadSetsTab"

import api from "../../utils/api"

import { useAppDispatch } from "../../hooks"
import { useParams, useNavigate } from "react-router-dom"
import { FMSParentProject } from "../../models/fms_api_models"

const MAX_PROJECT_NAME_LENGTH = 60

// Convertit en nombre l’ID du projet parent reçu dans l’URL.
const parseParentProjectID = (parentProjectID: string): number => {
  return Number(parentProjectID)
}

const ExternalProjectOverview = ({ parentProject }: { parentProject: FMSParentProject | null }) => (
  <>
    <Descriptions bordered size="small" column={4} style={{ marginBottom: 24 }}>
      <Descriptions.Item label="Name" span={4}>
        {parentProject?.name}
      </Descriptions.Item>
      <Descriptions.Item label="External ID" span={2}>
        {parentProject?.external_id}
      </Descriptions.Item>
      <Descriptions.Item label="Principal Investigator" span={2}>
        {parentProject?.principal_investigator}
      </Descriptions.Item>
      <Descriptions.Item label="Requestor Name" span={2}>
        {parentProject?.requestor_name}
      </Descriptions.Item>
      <Descriptions.Item label="Requestor Email" span={2}>
        {parentProject?.requestor_email}
      </Descriptions.Item>
    </Descriptions>
    <TrackingFieldsContent entity={parentProject} />
  </>
)

const ExternalProjectDetailsPage = () => {
  const { parentProjectId: paramParentProjectId } = useParams()
  const navigate = useNavigate()
  const parentProjectId = paramParentProjectId ? parseParentProjectID(paramParentProjectId) : null

  const [parentProject, setParentProject] = useState<FMSParentProject | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dispatch = useAppDispatch()

  // Charge depuis l’API le projet parent correspondant à l’ID reçu.
  const fetchParentProject = useCallback(
    async (parentProjectId: number): Promise<void> => {
      try {
        setError(null)
        const response = await dispatch(api.parentProjects.get(parentProjectId))
        setParentProject(response.data)
      } catch (requestError) {
        setParentProject(null)

        if (!(requestError instanceof Error && requestError.name === "AbortError")) {
          setError("Unable to fetch the external project")
        }
      }
    },
    [dispatch],
  )

  useEffect(() => {
    if (parentProjectId === null) {
      navigate("/external-projects-overview", {
        replace: true,
      })
      return
    }

    fetchParentProject(parentProjectId)
  }, [parentProjectId, fetchParentProject, navigate])

  const [activeKey, setActiveKey] = useHashURL("overview")
  const externalID = parentProject?.external_id ?? ""
  const internalProjectIDs = useMemo(() => parentProject?.projects ?? [], [parentProject])

  const projectName = parentProject?.name ?? ""

  const displayedProjectName =
    projectName.length > MAX_PROJECT_NAME_LENGTH
      ? `${projectName.slice(0, MAX_PROJECT_NAME_LENGTH)}…`
      : projectName

  return (
    <>
      <AppPageHeader
        title={
          parentProject
            ? `Project Overview: ${displayedProjectName} (External ID: ${externalID})`
            : "Project Overview"
        }
        extra={
          parentProject && (
            <EditButton url={`/external-projects-overview/${parentProject.id}/update`} />
          )
        }
      />

      <PageContent tabs>
        {error && <Alert type="error" title={error} style={{ marginBottom: 16 }} />}

        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          size="large"
          type="card"
          items={[
            {
              label: "Overview",
              key: "overview",
              children: <ExternalProjectOverview parentProject={parentProject} />,
            },
            {
              label: `Projects (${internalProjectIDs.length})`,
              key: "projects",
              children: parentProject && (
                <ProjectSubmissionsTab projectIDs={internalProjectIDs} externalID={externalID} />
              ),
            },
            {
              label: "Read Sets",
              key: "readsets",
              children: (
                <ProjectReadSetsTab parentProjectId={parentProjectId} externalID={externalID} />
              ),
            },
          ]}
        />
      </PageContent>
    </>
  )
}

export default ExternalProjectDetailsPage
