import React, {useEffect, useState} from "react";
import {merge, set} from "object-path-immutable";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";

import api, {withToken}  from "../../utils/api"

import {listByCollection, setFilterOption, setSortBy} from "../../modules/samples/actions";
import setDefaultFilter from "../../utils/setDefaultFilter";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import {withIndividual} from "../../utils/withItem";
import getFilterProps from "../filters/getFilterProps";
import getNFilters from "../filters/getNFilters";
import FiltersWarning from "../filters/FiltersWarning";
import {SampleDepletion} from "../samples/SampleDepletion";
import mergedListQueryParams from "../../utils/mergedListQueryParams";

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
  samples: state.samples.itemsByCollection,
  samplesByProject: state.samples.itemsByCollectionByID,
  individualsByID: state.individuals.itemsByID,
  isFetching: state.samples.isFetching,
});

const actionCreators = {listByCollection, setSortBy};

const ProjectsAssociatedSamples = ({
  token,
  projectID,
  samples,
  samplesByProject,
  individualsByID,
  sampleKinds,
  isFetching,
  page,
  listByCollection,
}) => {

  const initialFilter = {
    projects__id: {
      value: projectID
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
    listByCollection({filters, sortBy});
    // returned function will be called on component unmount
    return () => {
    }
  }, [projectID])

  useEffect(() => {
    listByCollection({filters, sortBy});
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

  let {projects, ...filtersForWarning} = filters

  const columns = getTableColumns(sampleKinds, individualsByID)
  .map(c => Object.assign(c, getFilterProps(
    c,
    SAMPLE_FILTERS,
    filters,
    setFilter,
    setFilterOption,
  )))

  const nFilters = getNFilters(filters)
  const nFiltersForWarning = nFilters - 1
  const totalCount = samples.length

  //So user does not see a previously fetched list
  samplesByProject = isFetching ? {} : samplesByProject

  return <>
    <PageContent>
      <div style={{ display: 'flex', textAlign: 'right', marginBottom: '1rem' }}>
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
        itemsByID={samplesByProject}
        rowKey="id"
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        filters={filters}
        sortBy={sortBy}
        onLoad={listByCollection}
        onChangeSort={setSorter}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(ProjectsAssociatedSamples);
