import { useDispatch, useSelector } from "react-redux"
import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import AddButton from "../AddButton";
import ExportButton from "../ExportButton";
import LinkButton from "../LinkButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/projects/actions";
import {actionDropdown} from "../../utils/templateActions";
import {withContainer, withIndividual} from "../../utils/withItem";
import {PROJECT_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import mergedListQueryParams from "../../utils/mergedListQueryParams";

const getTableColumns = () => [
    {
      title: "ID",
      dataIndex: "id",
      sorter: true,
      width: 80,
      render: (id, project) =>
        <Link to={`/projects/${project.id}`}>
          <div>{id}</div>
        </Link>,
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
      width: 80,
      render: (name, project) =>
        <Link to={`/projects/${project.id}`}>
          <div>{name}</div>
        </Link>,
    },
    {
      title: "Principal Investigator",
      dataIndex: "principal_investigator",
      sorter: true,
      width: 70,
    },
    {
      title: "Requestor Name",
      dataIndex: "requestor_name",
      sorter: true,
      width: 100,
    },
    {
      title: "Requestor Email",
      dataIndex: "requestor_email",
      width: 115,
    },
    {
      title: "Targeted End Date",
      dataIndex: "targeted_end_date",
      sorter: true,
      width: 115,
    },
    {
      title: "Status",
      dataIndex: "status",
      sorter: true,
      width: 115,
    }
  ];





const ProjectsListContent = ({  }) => {

  const token = useSelector((state) => state.auth.tokens.access)
  const projectsById = useSelector((state) => state.projects.itemsByID)
  const projects = useSelector((state) => state.projects.items)
  const actions = useSelector((state) => state.projectTemplateActions)
  const page = useSelector((state) => state.projects.page)
  const totalCount = useSelector((state) => state.projects.totalCount)
  const isFetching = useSelector((state) => state.projects.isFetching)
  const filters = useSelector((state) => state.projects.filters)
  const sortBy = useSelector((state) => state.projects.sortBy)
  const dispatch = useDispatch()
  const dispatchListTable = useCallback((...args) => listTable(...args), [dispatch])
  const dispatchSetFilter = useCallback((...args) => setFilter(...args), [dispatch])
  const dispatchSetFilterOption = useCallback((...args) => setFilterOption(...args), [dispatch])
  const dispatchClearFilters = useCallback((...args) => clearFilters(...args), [dispatch])
  const dispatchSetSortBy = useCallback((...args) => setSortBy(...args), [dispatch])

  const listExport = () =>
    withToken(token, api.projects.listExport)
    (mergedListQueryParams(PROJECT_FILTERS, filters, sortBy))
      .then(response => response.data)

  const columns = getTableColumns()
  .map(c => Object.assign(c, getFilterProps(
    c,
    PROJECT_FILTERS,
    filters,
    dispatchSetFilter,
    dispatchSetFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Projects" extra={[
      <AddButton key='add' url="/projects/add" />,
      actionDropdown("/projects", actions),
      <ExportButton key='export' exportFunction={listExport} filename="projects" itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
        <div style={{ flex: 1 }} />
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={PROJECT_FILTERS}
        />
        <Button
          style={{ margin: 6 }}
          disabled={nFilters === 0}
          onClick={dispatchClearFilters}
        >
          Clear Filters
        </Button>
      </div>
      <PaginatedTable
        columns={columns}
        items={projects}
        itemsByID={projectsById}
        rowKey="id"
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        filters={filters}
        sortBy={sortBy}
        onLoad={dispatchListTable}
        onChangeSort={dispatchSetSortBy}
      />
    </PageContent>
  </>;
}

export default ProjectsListContent;
