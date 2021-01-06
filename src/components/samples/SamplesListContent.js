import React from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Tag, Typography} from "antd";
import "antd/es/tag/style/css";
import "antd/es/typography/style/css";
const {Text} = Typography

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {SampleDepletion} from "./SampleDepletion";
import AddButton from "../AddButton";
import ExportButton from "../ExportButton";

import api, {withToken}  from "../../utils/api"

import {list, setSortBy} from "../../modules/samples/actions";
import {actionsToButtonList} from "../../utils/templateActions";
import SamplesFilters from "./SamplesFilters";
import serializeFilterParams from "../../utils/serializeFilterParams";
import {SAMPLE_FILTERS} from "../filters/descriptions";

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  samplesByID: state.samples.itemsByID,
  samples: state.samples.items,
  containersByID: state.containers.itemsByID,
  actions: state.sampleTemplateActions,
  page: state.samples.page,
  totalCount: state.samples.totalCount,
  isFetching: state.samples.isFetching,
  filters: state.samples.filters,
  sortBy: state.samples.sortBy,
});

const actionCreators = {list, setSortBy};

const SamplesListContent = ({
  token,
  samples,
  samplesByID,
  containersByID,
  actions,
  isFetching,
  page,
  totalCount,
  filters,
  sortBy,
  list,
  setSortBy,
}) => {
  const TABLE_COLUMNS = [
    {
      title: "Type",
      dataIndex: "biospecimen_type",
      sorter: true,
      width: 80,
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
      render: (name, sample) =>
        <Link to={`/samples/${sample.id}`}>
          <div>{name}</div>
          {sample.alias &&
            <div><small>alias: {sample.alias}</small></div>
          }
        </Link>,
    },
    {
      title: "Individual",
      dataIndex: "individual",
      render: individual => <Link to={`/individuals/${individual}`}>{individual}</Link>,
    },
    {
      title: "Container",
      dataIndex: "container",
      sorter: true,
      render: containerID =>
        <Link to={`/containers/${containerID}`}>
          {containersByID[containerID] ?
            containersByID[containerID].name :
            containerID
          }
        </Link>,
    },
    {
      title: "Coords",
      dataIndex: "coordinates",
      sorter: true,
      width: 70,
    },
    {
      title: "Vol. (µL)",
      dataIndex: "volume_history",
      align: "right",
      className: "table-column-numbers",
      render: vh => parseFloat(vh[vh.length - 1].volume_value).toFixed(3),
      width: 100,
    },
    {
      title: "Conc. (ng/µL)",
      dataIndex: "concentration",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      render: conc => conc !== null ? parseFloat(conc).toFixed(3) : null,
      width: 115,
    },
    {
      title: "Depleted",
      dataIndex: "depleted",
      sorter: true,
      render: depleted => <SampleDepletion depleted={depleted} />,
      width: 85,
    }
  ];

  const listExport = () =>
    withToken(token, api.samples.listExport)({...serializeFilterParams(filters, SAMPLE_FILTERS)}).then(response => response.data)

  const onChangeSort = (key, order) => {
    setSortBy(key, order)
    list()
  }

  return <>
    <AppPageHeader title="Samples & Extractions" extra={[
      <AddButton key='add' url="/samples/add" />,
      ...actionsToButtonList("/samples", actions),
      <ExportButton key='export' exportFunction={listExport} filename="samples"/>,
    ]}/>
    <PageContent>
      <SamplesFilters />
      <PaginatedTable
        // filters as a key in order to instantiate a new component on filters state change
        key={JSON.stringify(filters)}
        columns={TABLE_COLUMNS}
        items={samples}
        itemsByID={samplesByID}
        rowKey="id"
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        sortBy={sortBy}
        onLoad={list}
        onChangeSort={onChangeSort}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesListContent);
