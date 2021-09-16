import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/samples/actions";
import setDefaultFilter from "../../utils/setDefaultFilter";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import {SampleDepletion} from "../samples/SampleDepletion";
import mergedListQueryParams from "../../utils/mergedListQueryParams";

const getTableColumns = (sampleKinds) => [
    {
      title: "Sample Kind",
      dataIndex: "sample_kind__name",
      sorter: true,
      width: 70,
      options: sampleKinds.items.map(x => ({ label: x.name, value: x.name })), // for getFilterProps
      render: (_, sample) =>
        <Tag>{sampleKinds.itemsByID[sample.sample_kind].name}</Tag>,
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
      width: 170,
      render: (name, sample) =>
        <Link to={`/samples/${sample.id}`}>
          <div>{name}</div>
          {sample.alias &&
            <div><small>alias: {sample.alias}</small></div>
          }
        </Link>,
    },
    {
      title: "Cohort",
      dataIndex: "individual__cohort",
      sorter: true,
      width: 130,
    },
    {
      title: "Vol. (µL)",
      dataIndex: "volume",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      width: 70,
    },
    {
      title: "Depleted",
      dataIndex: "depleted",
      sorter: true,
      render: depleted => <SampleDepletion depleted={depleted} />,
      width: 50,
    }
  ];

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  sampleKinds: state.sampleKinds,
  page: state.samples.page,
  samples: state.samples.items,
  samplesByID: state.samples.itemsByID,
  totalCount: state.samples.totalCount,
  isFetching: state.samples.isFetching,
  filters: state.samples.filters,
  sortBy: state.samples.sortBy,
});

const actionCreators = {listTable, setFilter, clearFilters, setSortBy};

const ProjectsAssociatedSamples = ({
  token,
  projectName,
  samples,
  samplesByID,
  sampleKinds,
  isFetching,
  page,
  filters,
  totalCount,
  sortBy,
  listTable,
  setFilter,
  clearFilters,
  setSortBy,
}) => {

  useEffect(() => {
    //will be called on component will mount
    clearFilters()
    // returned function will be called on component unmount
    return () => {
      clearFilters()
    }
  }, [])

  setDefaultFilter(SAMPLE_FILTERS.projects__name.key, projectName, setFilter, filters, clearFilters)
  let {projects, ...filtersForWarning} = filters


  const columns = getTableColumns(sampleKinds)
  .map(c => Object.assign(c, getFilterProps(
    c,
    SAMPLE_FILTERS,
    filters,
    setFilter,
    setFilterOption,
  )))

  const nFilters = getNFilters(filters)
  const nFiltersForWarning = nFilters - 1

  return <>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
        <FiltersWarning
          nFilters={nFiltersForWarning}
          filters={filtersForWarning}
          description={SAMPLE_FILTERS}
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
        items={samples}
        itemsByID={samplesByID}
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

export default connect(mapStateToProps, actionCreators)(ProjectsAssociatedSamples);
