import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Button, Table} from "antd";
import "antd/es/button/style/css";
import "antd/es/table/style/css";
import {EditOutlined, ExperimentOutlined, PlusOutlined} from "@ant-design/icons";

import objectByIdToArray from "../../utils/objectByIdToArray";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import PaginatedTable from "../PaginatedTable";
import {SampleDepletion} from "./SampleDepletion";
import {list} from "../../modules/samples/actions";

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
    page: state.samples.page,
    totalCount: state.samples.totalCount,
    isFetching: state.samples.isFetching,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ list }, dispatch);

const SamplesListContent = ({
    samples,
    samplesByID,
    isFetching,
    page,
    totalCount,
    list,
}) => <>
    <AppPageHeader title="Samples & Extractions"
                   extra={[
                       <Link key="add" to="/samples/add">
                           <Button icon={<PlusOutlined />}>Add Samples</Button>
                       </Link>,
                       <Link key="update" to="/samples/update">
                           <Button icon={<EditOutlined />}>Update Samples</Button>
                       </Link>,
                       <Link key="process" to="/samples/extract">
                           <Button icon={<ExperimentOutlined />}>Process Extractions</Button>
                       </Link>,
                   ]} />
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

export default connect(mapStateToProps, mapDispatchToProps)(SamplesListContent);
