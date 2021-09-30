import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import FilteredList from "../FilteredList";

import api, {withToken}  from "../../utils/api"

import {list, setFilterOption} from "../../modules/projects/actions";
import {PROJECT_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";

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
  page: state.projects.page,
  projects: state.projects.temporaryItems,
  projectsByID: state.projects.itemsByID,
  isFetching: state.projects.isFetching,
});

const actionCreators = {list};

const SamplesAssociatedProjects = ({
  token,
  sampleID,
  projects,
  projectsByID,
  isFetching,
  page,
  list,
}) => {

  const filterKey = PROJECT_FILTERS.samples__id.key

  //Local filters and sorters
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState({});

  const columns = getTableColumns();

  return <>
    <FilteredList
      description = {PROJECT_FILTERS}
      columns={columns}
      list={list}
      items={projects}
      itemsByID={projectsByID}
      filterID={sampleID}
      filterKey={filterKey}
      rowKey="id"
      isFetching={isFetching}
      page={page}
      filters={filters}
      setFilters={setFilters}
      sortBy={sortBy}
      setSortBy={setSortBy}
    />
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesAssociatedProjects);
