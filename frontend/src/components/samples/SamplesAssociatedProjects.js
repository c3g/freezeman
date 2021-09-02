import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/projects/actions";
import {PROJECT_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import mergedListQueryParams from "../../utils/mergedListQueryParams";

const getTableColumns = () => [
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

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  page: state.samples.page,
  sortBy: state.samples.sortBy,
});

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const SamplesAssociatedProjects = ({
  token,
  projects,
  projectsByID,
  isFetching,
  page,
  totalCount,
  sortBy,
  listTable,
  setFilter,
  setFilterOption,
  clearFilters,
  setSortBy,
}) => {

  const filters = {}

  const columns = getTableColumns()
  .map(c => Object.assign(c, getFilterProps(
    c,
    PROJECT_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  console.log(projectsByID)

  const isDoneFetchingProjects = projectsByID.every(project => project && !project.isFetching)

  if(isDoneFetchingProjects)
    return <>
      <PageContent>
        <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
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
          itemsByID={projectsByID}
          rowKey="id"
          loading={!isDoneFetchingProjects}
          totalCount={totalCount}
          page={page}
          filters={filters}
          sortBy={sortBy}
          onChangeSort={setSortBy}
        />
      </PageContent>
    </>;
  else
    return null
}

export default connect(mapStateToProps, actionCreators)(SamplesAssociatedProjects);
