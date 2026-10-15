import React, { useEffect, useMemo, useState } from "react"

import { Empty, Table } from "antd"
import { Link } from "react-router-dom"

import { useAppDispatch } from "../../hooks"
import { FMSProject } from "../../models/fms_api_models"
import api from "../../utils/api"

import { useCreateCsvExportFunction } from "./useCsvExport"
import { ProjectOverviewExportButtonData } from "./types"
import ProjectOverviewExportButton from "./ProjectOverviewExportButton"

interface ProjectSubmissionsTabProps {
  projectIDs: number[]
  externalID: string
}

const submissionColumns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    render: (id: number) => <Link to={`/projects/${id}#overview`}>{id}</Link>,
  },
  {
    title: "Project Submissions Names",
    dataIndex: "name",
    key: "name",
    render: (name: string, project: FMSProject) => (
      <Link to={`/projects/${project.id}#overview`}>{name}</Link>
    ),
  },
  {
    title: "External ID",
    dataIndex: "external_id",
    key: "external_id",
  },
  {
    title: "Principal Investigator",
    dataIndex: "principal_investigator",
    key: "principal_investigator",
  },
  {
    title: "Requestor Name",
    dataIndex: "requestor_name",
    key: "requestor_name",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
  },
  {
    title: "Created At",
    dataIndex: "created_at",
    key: "created_at",
    render: (createdAt: string) =>
      createdAt
        ? new Date(createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "",
  },
]

const ProjectSubmissionsTab = ({ projectIDs, externalID }: ProjectSubmissionsTabProps) => {
  const dispatch = useAppDispatch()
  const [fetchedProjects, setFetchedProjects] = useState<FMSProject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // Avoids a synchronous state reset in the effect when the parent has no projects.
  const internalProjects = useMemo(
    () => (projectIDs.length === 0 ? [] : fetchedProjects),
    [projectIDs, fetchedProjects],
  )

  // Charge les projets internes correspondant aux IDs associés au projet parent.
  useEffect(() => {
    if (projectIDs.length === 0) {
      return
    }

    let cancelled = false
    const fetchInternalProjects = async () => {
      try {
        setIsLoading(true)
        const response = await dispatch(
          api.projects.list(
            {
              id__in: projectIDs.join(","),
              limit: 100000,
            },
            true,
          ),
        )
        if (!cancelled) {
          setFetchedProjects(response.data.results)
        }
      } catch {
        if (!cancelled) {
          setFetchedProjects([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchInternalProjects()
    return () => {
      cancelled = true
    }
  }, [dispatch, projectIDs])

  const exportProjects = useMemo<Record<string, unknown>[]>(
    () =>
      internalProjects.map((project) => ({
        id: project.id,
        name: project.name,
        external_id: project.external_id ?? "",
        principal_investigator: project.principal_investigator,
        requestor_name: project.requestor_name,
        status: project.status,
        created_at: project.created_at,
      })),
    [internalProjects],
  )

  const generateCsvContent = useCreateCsvExportFunction(exportProjects)

  if (!isLoading && internalProjects.length === 0) {
    return <Empty description={`No project submissions found for ${externalID}`} />
  }

  const exportButtonData: ProjectOverviewExportButtonData = {
    exportType: "Associated Projects",
    exportFunction: generateCsvContent,
    filename: "Associated Projects",
    itemsCount: internalProjects.length,
    disabled: internalProjects.length === 0,
  }

  return (
    <>
      {!isLoading && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <ProjectOverviewExportButton data={exportButtonData} />
        </div>
      )}

      <Table
        size="small"
        bordered
        rowKey="id"
        dataSource={internalProjects}
        columns={submissionColumns}
        loading={isLoading}
        scroll={{ y: "42vh" }}
        pagination={{
          pageSize: 20,
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }}
      />
    </>
  )
}

export default ProjectSubmissionsTab
