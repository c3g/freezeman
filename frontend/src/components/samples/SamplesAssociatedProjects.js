import { useDispatch, useSelector } from "react-redux"
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





const SamplesAssociatedProjects = ({ sampleID }) => {

  const token = useSelector((state) => state.auth.tokens.access)
  const page = useSelector((state) => state.projects.page)
  const projects = useSelector((state) => state.projects.filteredItems)
  const projectsByID = useSelector((state) => state.projects.itemsByID)
  const totalCount = useSelector((state) => state.projects.filteredItemsCount)
  const isFetching = useSelector((state) => state.projects.isFetching)
  const dispatch = useDispatch()
  const dispatchListFilter = useCallback((...args) => listFilter(...args), [dispatch])

  const filterKey = PROJECT_FILTERS.samples__id.key

  const columns = getTableColumns();

  return <>
    <FilteredList
      description = {PROJECT_FILTERS}
      columns={columns}
      dispatchListFilter={listFilter}
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

export default SamplesAssociatedProjects;
