import React, {useRef} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";

import api, {withToken}  from "../../utils/api"

import {listTable, setFilter, setFilterOption, clearFilters, setSortBy} from "../../modules/samples/actions";
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
      dataIndex: "cohort",
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
  sortBy: state.samples.sortBy,
});

const actionCreators = {listTable, setFilter, setFilterOption, clearFilters, setSortBy};

const ProjectsAssociatedSamples = ({
  token,
  samples,
  samplesByID,
  sampleKinds,
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

  const columns = getTableColumns(sampleKinds)
  .map(c => Object.assign(c, getFilterProps(
    c,
    SAMPLE_FILTERS,
    filters,
    setFilter,
    setFilterOption
  )))

  const nFilters = getNFilters(filters)

  const isDoneFetchingSamples = samplesByID.every(sample => sample && !sample.isFetching)

  if(isDoneFetchingSamples)
    return <>
      <PageContent>
        <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1em' }}>
          <FiltersWarning
            nFilters={nFilters}
            filters={filters}
            description={SAMPLE_FILTERS}
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
          items={samples}
          itemsByID={samplesByID}
          rowKey="id"
          loading={!isDoneFetchingSamples}
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

export default connect(mapStateToProps, actionCreators)(ProjectsAssociatedSamples);
