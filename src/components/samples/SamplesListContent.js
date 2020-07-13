import React, {useEffect} from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {EditOutlined, ExperimentOutlined, PlusOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {SampleDepletion} from "./SampleDepletion";

import {list, listTemplateActions} from "../../modules/samples/actions";
import {actionsToPageHeaderList} from "../../utils/templateActions";

const TABLE_COLUMNS = [
  {
    title: "Type",
    dataIndex: "biospecimen_type",
    width: 80,
  },
  {
    title: "Name",
    dataIndex: "name",
    render: (name, sample) => <Link to={`/samples/${sample.id}`}>{name}</Link>,
  },
  {
    title: "Alias",
    dataIndex: "alias",
  },
  {
    title: "Individual",
    dataIndex: "individual",
    render: individual => <Link to={`/individuals/${individual}`}>{individual}</Link>,
  },
  {
    title: "Container",
    dataIndex: "container",
    render: container => <Link to={`/containers/${container}`}>{container}</Link>,
  },
  {
    title: "Coords",
    dataIndex: "coordinates",
    width: 70,
  },
  {
    title: "Vol. (µL)",
    dataIndex: "volume_history",
    render: vh => parseFloat(vh[vh.length - 1].volume_value).toFixed(3),
    width: 100,
  },
  {
    title: "Conc. (ng/µL)",
    dataIndex: "concentration",
    render: conc => conc === null ? "—" : parseFloat(conc).toFixed(3),
    width: 115,
  },
  {
    title: "Depleted",
    dataIndex: "depleted",
    render: depleted => <SampleDepletion depleted={depleted} />,
    width: 85,
  }
];

const mapStateToProps = state => ({
  samplesByID: state.samples.itemsByID,
  samples: state.samples.items,
  actions: state.sampleTemplateActions,
  page: state.samples.page,
  totalCount: state.samples.totalCount,
  isFetching: state.samples.isFetching,
});

const actionCreators = {list, listTemplateActions};

const actionIcon = a => {
  if (a.name.includes("Add")) return <PlusOutlined />;
  if (a.name.includes("Update")) return <EditOutlined />;
  if (a.name.includes("Process")) return <ExperimentOutlined />;
  return undefined;
}

const SamplesListContent = ({
  samples,
  samplesByID,
  actions,
  isFetching,
  page,
  totalCount,
  list,
  listTemplateActions,
}) => {
  useEffect(() => {
    // Must be wrapped; effects cannot return promises
    listTemplateActions();
  }, []);
  return <>
    <AppPageHeader title="Samples & Extractions"
                   extra={actionsToPageHeaderList("/samples", actions, actionIcon)} />
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
