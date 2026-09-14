import { Pagination, Table, Tag } from "antd"
import type { ColumnsType } from "antd/es/table"
import React, { useCallback, useEffect, useMemo } from "react"
import AppPageHeader from "../AppPageHeader"
import { Link } from "react-router-dom"
import { FMSProject, FMSParentProject } from "../../models/fms_api_models"

import PageContent from "../PageContent"


import FiltersBar from "../filters/filtersBar/FiltersBar"

import { ROUTE } from "./ExternalProjectsPage"
import { ColumnDefinitions, createQueryParamsFromFilters, FetchRowData, FilterDescriptions, FilterKeys, Filters, newFilterDefinitionsToFilterSet, SearchPropertiesDefinitions, useFilters, usePaginatedDataProps, useTableColumnsProps } from "../../utils/tableHooks"
import { FILTER_TYPE } from "../../constants"
import { useAppDispatch } from "../../hooks"
import api from "../../utils/api"

enum ParentProjectColumnID {
  EXTERNAL_ID = "EXTERNAL_ID",
  FREEZEMAN_PROJECT_COUNT = "FREEZEMAN_PROJECT_COUNT",
  ID = "ID",
  NAME = "NAME",
  PRINCIPAL_INVESTIGATOR = "PRINCIPAL_INVESTIGATOR",
}

const FILTER_KEYS: FilterKeys<ParentProjectColumnID> = {
  [ParentProjectColumnID.EXTERNAL_ID]: "external_id",
  [ParentProjectColumnID.NAME]: "name",
  [ParentProjectColumnID.PRINCIPAL_INVESTIGATOR]: "principal_investigator",
}

const FILTER_DESCRIPTIONS: FilterDescriptions<ParentProjectColumnID> = {
  [ParentProjectColumnID.EXTERNAL_ID]: {
    type: FILTER_TYPE.INPUT,
    exactMatch: true,
    startsWith: false,
  },
  [ParentProjectColumnID.NAME]: {
    type: FILTER_TYPE.INPUT,
    exactMatch: false,
    startsWith: false,
  },
  [ParentProjectColumnID.PRINCIPAL_INVESTIGATOR]: {
    type: FILTER_TYPE.INPUT,
    exactMatch: false,
    startsWith: false,
  },
}

const SEARCH_DEFINITIONS: SearchPropertiesDefinitions<ParentProjectColumnID> = {
  [ParentProjectColumnID.EXTERNAL_ID]: { placeholder: "External Project ID" },
  [ParentProjectColumnID.NAME]: { placeholder: "External Project Name" },
  [ParentProjectColumnID.PRINCIPAL_INVESTIGATOR]: { placeholder: "Principal Investigator" },
}

const ROW_KEY = "external_id"

const COLUMN_DEFINITIONS: ColumnDefinitions<ParentProjectColumnID, FMSParentProject> = {
  [ParentProjectColumnID.EXTERNAL_ID]: {
    title: "External Project ID",
    dataIndex: "external_id",
    key: "external_id",
    width: 120,
    render: (externalID: string, parentProject: FMSParentProject) => (
      <Link to={`${ROUTE}/${parentProject.id}#projects`}>{externalID}</Link>
    ),
  },
  [ParentProjectColumnID.NAME]: {
    title: "External Project Name",
    dataIndex: "name",
    key: "name",
  },
  [ParentProjectColumnID.PRINCIPAL_INVESTIGATOR]: {
    title: "Principal Investigator",
    dataIndex: "principal_investigator",
    key: "principal_investigator",
    width: 220,
  },
  [ParentProjectColumnID.FREEZEMAN_PROJECT_COUNT]: {
    title: "Freezeman Projects",
    dataIndex: "projects",
    key: "projects",
    width: 120,
    render: (projects: FMSParentProject["projects"]) => {
      const projectCount = projects?.length ?? 0
      return <Tag color={projectCount > 1 ? "blue" : "default"}>{projectCount}</Tag>
    }
  },
}

const internalProjectColumns: ColumnsType<FMSProject> = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    render: (id: number) => <Link to={`/projects/${id}#overview`}>{id}</Link>,
  },
  {
    title: "Project Name",
    dataIndex: "name",
    key: "name",
    render: (name: string, project: FMSProject) => (
      <Link to={`/projects/${project.id}#overview`}>{name}</Link>
    ),
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

const ExternalProjectsListContent = () => {
  const dispatch = useAppDispatch()

  const fetchParentProjects = useCallback<FetchRowData<ParentProjectColumnID, FMSParentProject>>(
    async ({ pageNumber, pageSize, filters }) => {
      const response = await dispatch(
        api.parentProjects.list(
          {
            ...createQueryParamsFromFilters(FILTER_KEYS, FILTER_DESCRIPTIONS, filters),
            offset: (pageNumber - 1) * pageSize,
            limit: pageSize,
          },
          {
            abort: true,
            requestID: "ExternalProjectsListContent.fetchParentProjects",
          },
        ),
      )
      return {
        total: response.data.count,
        data: response.data.results,
      }
    },
    [dispatch],
  )

  const tableHeight = "60vh"

  const [tableDataProps, paginationProps, { fetchRowData }] = usePaginatedDataProps({
    defaultPageSize: 20,
    fetchRowData: fetchParentProjects,
    bodySpinStyle: useMemo(() => ({ height: tableHeight, alignContent: "center" }), [tableHeight]),
  })

  const DEBOUNCE_DELAY = 500
  const debouncedOnFilter = useCallback(
    (newFilters: Filters<ParentProjectColumnID>) => {
      fetchRowData({ filters: newFilters, pageNumber: 1 }, DEBOUNCE_DELAY)
    },
    [fetchRowData],
  )
  const [filters, setFilters] = useFilters<ParentProjectColumnID>({}, debouncedOnFilter)

  const tableColumnsProps = useTableColumnsProps<ParentProjectColumnID, FMSParentProject>({
    filters,
    setFilters,
    filterDescriptions: FILTER_DESCRIPTIONS,
    columnDefinitions: COLUMN_DEFINITIONS,
    searchPropertyDefinitions: SEARCH_DEFINITIONS,
  })

  const filterSet = useMemo(
    () =>
      Object.entries(filters).reduce(
        (acc, [columnID, filterValue]) => {
          const filterDescription = FILTER_DESCRIPTIONS[columnID as PooledSampleColumnID]
          if (!filterDescription) {
            return acc
          }
          return {
            ...acc,
            ...newFilterDefinitionsToFilterSet(
              columnID as ParentProjectColumnID,
              filterValue,
              filterDescription,
              SEARCH_DEFINITIONS[columnID as ParentProjectColumnID],
            ),
          }
        },
        {} as ReturnType<typeof newFilterDefinitionsToFilterSet>,
      ),
    [filters],
  )

  useEffect(() => {
    fetchRowData({ pageNumber: 1, pageSize: 20 })
  }, [fetchRowData])

  return (
    <>
      <AppPageHeader title="Projects by External ID" />

      <PageContent>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <FiltersBar filters={filterSet} clearFilters={() => setFilters({})} />
        </div>
        <Table<FMSParentProject>
          {...tableDataProps}
          {...tableColumnsProps}
          rowKey={ROW_KEY}
          scroll={{ y: tableHeight }}
          bordered
          pagination={paginationProps}
        />
      </PageContent>
    </>
  )
}

export default ExternalProjectsListContent
