import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";

import api, {withToken}  from "../../utils/api"

import {listBySample, setFilterOption} from "../../modules/projects/actions";
import setDefaultFilter from "../../utils/setDefaultFilter";
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
  projects: state.projects.itemsBySample,
  projectsByID: state.projects.itemsBySampleByID,
  isFetching: state.projects.isFetching,
});

const actionCreators = {listBySample};

const SamplesAssociatedProjects = ({
  token,
  sampleID,
  projects,
  projectsByID,
  isFetching,
  page,
  listBySample,
}) => {

  const initialFilter = {
    samples__id: {
      value: sampleID
    }
  };

  const initialSorter = {
    key: undefined,
    order: undefined
  };

  //Local filters and sorters
  const [filters, setFilters] = useState(initialFilter);
  const [sortBy, setSortBy] = useState(initialSorter);

  useEffect(() => {
    setFilters(initialFilter);
    listBySample({filters, sortBy});
    // returned function will be called on component unmount
    return () => {
    }
  }, [sampleID])

  useEffect(() => {
    listBySample({filters, sortBy});
    // returned function will be called on component unmount
    return () => {
    }
  }, [filters, sortBy])

  const setFilter = (name, value) => {
    setFilters({...filters,  [name] : {"value" : value }})
  }

  const clearFilters = () => {
    setFilters({...initialFilter});
  }

  const setSorter = (key, order) => {
    setSortBy({key: key, order: order })
  }

  let {samples, ...filtersForWarning} = filters

  const columns = getTableColumns()
  .map(c => Object.assign(c, getFilterProps(
    c,
    PROJECT_FILTERS,
    filters,
    setFilter,
    setFilterOption,
  )))

  const nFilters = getNFilters(filters)
  const nFiltersForWarning = nFilters - 1
  const totalCount = projects.length

   //So user does not see a previously fetched list
   const projectsBySample = isFetching ? {} : projectsByID

  return <>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
        <FiltersWarning
          nFilters={nFiltersForWarning}
          filters={filtersForWarning}
          description={PROJECT_FILTERS}
        />
        <Button
          style={{ margin: 6 }}
          disabled={nFiltersForWarning === 0}
          onClick={clearFilters}
        >
          Clear Filters
        </Button>
      </div>
      <PaginatedTable
        columns={columns}
        items={projects}
        itemsByID={projectsBySample}
        rowKey="id"
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        filters={filters}
        sortBy={sortBy}
        onLoad={listBySample}
        onChangeSort={setSorter}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesAssociatedProjects);
