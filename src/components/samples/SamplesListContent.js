import React, {useEffect} from "react";
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

import {list} from "../../modules/samples/actions";
import {actionsToButtonList} from "../../utils/templateActions";

const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  samplesByID: state.samples.itemsByID,
  samples: state.samples.items,
  containersByID: state.containers.itemsByID,
  actions: state.sampleTemplateActions,
  page: state.samples.page,
  totalCount: state.samples.totalCount,
  isFetching: state.samples.isFetching,
});

const actionCreators = {list};

const SamplesListContent = ({
  token,
  samples,
  samplesByID,
  containersByID,
  actions,
  isFetching,
  page,
  totalCount,
  list,
}) => {
  const TABLE_COLUMNS = [
    {
      title: "Type",
      dataIndex: "biospecimen_type",
      width: 80,
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: "Name",
      dataIndex: "name",
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
      align: "right",
      className: "table-column-numbers",
      render: conc => conc !== null ? parseFloat(conc).toFixed(3) : null,
      width: 115,
    },
    {
      title: "Depleted",
      dataIndex: "depleted",
      render: depleted => <SampleDepletion depleted={depleted} />,
      width: 85,
    }
  ];
  const listExport = () =>
    withToken(token, api.samples.listExport)().then(response => response.data)

  return <>
    <AppPageHeader title="Samples & Extractions" extra={[
      <AddButton url="/samples/add" />,
      ...actionsToButtonList("/samples", actions),
      <ExportButton exportFunction={listExport} filename="samples"/>,
    ]}/>
    <PageContent>
      <PaginatedTable
        columns={TABLE_COLUMNS}
        items={samples}
        itemsByID={samplesByID}
        rowKey="id"
        loading={isFetching}
        totalCount={totalCount}
        page={page}
        onLoad={list}
      />
    </PageContent>
  </>;
}

export default connect(mapStateToProps, actionCreators)(SamplesListContent);
