import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import FilteredList from "../FilteredList";

import api, {withToken}  from "../../utils/api"

import {list, setFilterOption} from "../../modules/samples/actions";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import {withIndividual} from "../../utils/withItem";
import getFilterProps from "../filters/getFilterProps";
import {SampleDepletion} from "../samples/SampleDepletion";

const getTableColumns = (sampleKinds, individualsByID) => [
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
      render: (_, sample) => {
        const individual = sample.individual
        return (individual &&
          <Link to={`/individuals/${individual}`}>
            {withIndividual(individualsByID, individual, individual => individual.cohort, "loading...")}
          </Link>)
      }
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
  samplesByID: state.samples.itemsByID,
  samples: state.samples.temporaryItems,
  individualsByID: state.individuals.itemsByID,
  isFetching: state.samples.isFetching,
});

const actionCreators = {list};

const ProjectsAssociatedSamples = ({
  token,
  projectID,
  samplesByID,
  samples,
  individualsByID,
  sampleKinds,
  isFetching,
  page,
  list,
}) => {

  const filterKey = SAMPLE_FILTERS.projects__id.key

  //Local filters and sorters
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState({});

  const columns = getTableColumns(sampleKinds, individualsByID)

  return <>
    <FilteredList
      description = {SAMPLE_FILTERS}
      columns={columns}
      list={list}
      items={samples}
      itemsByID={samplesByID}
      filterID={projectID}
      filterKey={filterKey}s
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

export default connect(mapStateToProps, actionCreators)(ProjectsAssociatedSamples);
