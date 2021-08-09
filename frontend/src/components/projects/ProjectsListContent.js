import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import AddButton from "../AddButton";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/projects/actions";
import {actionsToButtonList} from "../../utils/templateActions";
import {withContainer, withIndividual} from "../../utils/withItem";
import {PROJECT_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import ProjectsFilters from "./ProjectsFilters";
import mergedListQueryParams from "../../utils/mergedListQueryParams";

const getTableColumns = () => [
    {
      title: "ID",
      dataIndex: "id",
      sorter: true,
      width: 80,
      render: (id, project) =>
        <Link to={`/project/${project.id}`}>
          <div>{id}</div>
        </Link>,
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
      width: 80,
      render: (name, project) =>
        <Link to={`/project/${project.id}`}>
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
      align: "right",
      className: "table-column-numbers",
      width: 100,
    },
    {
      title: "Requestor Email",
      dataIndex: "requestor_email",
      align: "right",
      className: "table-column-numbers",
      width: 115,
    },
    {
      title: "Targeted End Date",
      dataIndex: "targeted_end_date",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      width: 115,
    },
    {
      title: "Status",
      dataIndex: "status",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      width: 115,
    },
    {
      title: "Comments",
      dataIndex: "comments",
      align: "right",
      className: "table-column-numbers",
      width: 115,
    },
  ];

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  projectsById: state.projects.itemsByID,
  projects: state.projects.items,
  page: state.projects.page,
  totalCount: state.projects.totalCount,
  isFetching: state.projects.isFetching,
  filters: state.projects.filters,
  sortBy: state.projects.sortBy,
});

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const ProjectsListContent = ({
  token,
  projects,
  projectsById,
  actions,
  isFetching,
  page,
  totalCount,
  filters,
  sortBy,
  listTable,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
}) => {

  const listExport = () =>
    withToken(token, api.projects.listExport)
    (mergedListQueryParams(PROJECT_FILTERS, filters, sortBy))
      .then(response => response.data)

  const columns = getTableColumns()
  .map(c => Object.assign(c, getFilterProps(
    c,
    PROJECT_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  return <>
    <AppPageHeader title="Projects" extra={[
      <AddButton key='add' url="/projects/add" />,
      <ExportButton key='export' exportFunction={listExport} filename="projects" itemsCount={totalCount}/>,
    ]}/>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
        <ProjectsFilters style={{ flex: 1 }} />
        <FiltersWarning
          nFilters={nFilters}
          filters={filters}
          description={PROJECT_FILTERS}
        />
        <Button
          style={{ margin: 6 }}
          disabled={nFilters === 0}
          onClick={clearFilters}
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
        onLoad={listTable}
        onChangeSort={setSortBy}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(ProjectsListContent);
