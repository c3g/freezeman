import React from "react";
import {connect} from "react-redux";
import {useHistory, useParams} from "react-router-dom";

import {Descriptions, Tag} from "antd";
import "antd/es/descriptions/style/css";
import "antd/es/tag/style/css";

import {BarcodeOutlined} from "@ant-design/icons";

import AppPageHeader from "../AppPageHeader";
import ContainerHierarchy from "./ContainerHierarchy";
import PageContent from "../PageContent";

const extraStyle = {
    display: "flex",
    flexDirection: "row",
    height: "100%",
    alignItems: "center",
}

const ContainersDetailContent = ({containersByBarcode}) => {
    const history = useHistory();
    const {barcode} = useParams();
    const container = containersByBarcode[barcode];

    // TODO: Load container if not loaded
    if (!container) return null;

    // TODO: More data (kind tag, barcode, etc.)
    return <>
        <AppPageHeader title={container.name} onBack={history.goBack} extra={[
            <div style={extraStyle}>
                <div key="kind">
                    <Tag>{container.kind}</Tag>
                </div>
                <div key="barcode">
                    <BarcodeOutlined /> {container.barcode}
                </div>
            </div>
        ]} />
        <PageContent>
            <Descriptions bordered={true} size="small">
                <Descriptions.Item label="Name" span={2}>{container.name}</Descriptions.Item>
                <Descriptions.Item label="Barcode">{container.barcode}</Descriptions.Item>
                <Descriptions.Item label="Location" span={2}>
                    {container.location || "—"}{container.coordinates ? `at ${container.coordinates}` : ""}
                </Descriptions.Item>
                <Descriptions.Item label="Kind">{container.kind}</Descriptions.Item>
                <Descriptions.Item label="Hierarchy" span={3}>
                    <ContainerHierarchy container={container} />
                </Descriptions.Item>
                <Descriptions.Item label="Comment" span={3}>{container.comment}</Descriptions.Item>
                <Descriptions.Item label="Contents" span={3}>TODO</Descriptions.Item>
            </Descriptions>
        </PageContent>
    </>;
};

const mapStateToProps = state => ({
    containersByBarcode: state.containers.itemsByBarcode,
});

export default connect(mapStateToProps)(ContainersDetailContent);
