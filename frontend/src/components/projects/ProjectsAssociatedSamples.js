import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";
import {Button, Tag} from "antd";

import FilteredList from "../FilteredList";

import api, {withToken}  from "../../utils/api"

import {listFilter, setFilterOption} from "../../modules/samples/actions";
import {SAMPLE_FILTERS} from "../filters/descriptions";
import WITH_ITEM from "../../utils/withItem";
import getFilterProps from "../filters/getFilterProps";
import {Depletion} from "../Depletion";
import { withItemWrapper } from "../shared/WithItemComponent"

const getTableColumns = (sampleKinds, individualsByID) => {
  const withIndividual = withItemWrapper(WITH_ITEM.withIndividual)
  
  return [
    {
      title: "Sample Kind",
      dataIndex: "derived_samples__sample_kind__name",
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
      dataIndex: "derived_samples__biosample__individual__cohort",
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
      title: "Creation Date",
      dataIndex: "creation_date",
      sorter: true,
      width: 115,
    },
    {
      title: "Depleted",
      dataIndex: "depleted",
      sorter: true,
      render: depleted => <Depletion depleted={depleted} />,
      width: 50,
    }
  ];
}

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  sampleKinds: state.sampleKinds,
  page: state.samples.page,
  samplesByID: state.samples.itemsByID,
  samples: state.samples.filteredItems,
  totalCount: state.samples.filteredItemsCount,
  individualsByID: state.individuals.itemsByID,
  isFetching: state.samples.isFetching,
});

const actionCreators = {listFilter};

const ProjectsAssociatedSamples = ({
  token,
  projectID,
  samplesByID,
  samples,
  totalCount,
  individualsByID,
  sampleKinds,
  isFetching,
  page,
  listFilter,
}) => {

  const filterKey = SAMPLE_FILTERS.projects__id.key

  const columns = getTableColumns(sampleKinds, individualsByID)

  return <>
    <FilteredList
      description={SAMPLE_FILTERS}
      columns={columns}
      listFilter={listFilter}
      items={samples}
      itemsByID={samplesByID}
      totalCount={totalCount}
      filterID={projectID}
      filterKey={filterKey}
      rowKey="id"
      isFetching={isFetching}
      page={page}
    />
  </>;
}

export default connect(mapStateToProps, actionCreators)(ProjectsAssociatedSamples);
