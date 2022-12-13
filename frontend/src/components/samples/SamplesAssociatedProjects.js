import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import FilteredList from "../FilteredList";

import api, {withToken}  from "../../utils/api"

import {listFilter, setFilterOption} from "../../modules/projects/actions";
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
  projects: state.projects.filteredItems,
  projectsByID: state.projects.itemsByID,
  totalCount: state.projects.filteredItemsCount,
  isFetching: state.projects.isFetching,
});

const actionCreators = {listFilter};

const SamplesAssociatedProjects = ({
  token,
  sampleID,
  projects,
  projectsByID,
  totalCount,
  isFetching,
  page,
  listFilter,
}) => {

  const filterKey = PROJECT_FILTERS.project_derived_samples__samples__id.key

  const columns = getTableColumns();

  return <>
    <FilteredList
      description = {PROJECT_FILTERS}
      columns={columns}
      listFilter={listFilter}
      items={projects}
      itemsByID={projectsByID}
      totalCount={totalCount}
      filterID={sampleID}
      filterKey={filterKey}
      rowKey="id"
      isFetching={isFetching}
      page={page}
    />
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesAssociatedProjects);
