import React from "react";
import {connect} from "react-redux";
import {Link} from "react-router-dom";

import {Button, Card, Col, Row, Statistic} from "antd";
import "antd/es/button/style/css";
import "antd/es/card/style/css";
import "antd/es/col/style/css";
import "antd/es/row/style/css";
import "antd/es/statistic/style/css";

import {
    EditOutlined,
    ExperimentOutlined,
    ExportOutlined,
    PlusOutlined,
    ProfileOutlined,
    SolutionOutlined,
} from "@ant-design/icons";

import AppPageHeader from "./AppPageHeader";
import PageContainer from "./PageContainer";
import PageContent from "./PageContent";

const COL_LAYOUT = {
    lg: 8,
    xs: 24,
    style: {marginTop: "16px"}
};

const CARD_PROPS = {
    size: "small",
};

const BUTTON_COL_PROPS = {
    xs: 24,
    sm: 12,
    style: {marginTop: "8px"},
};

const WIDE_BUTTON_COL_PROPS = {
    xs: 24,
    style: {marginTop: "8px"},
};

const DashboardPage = ({containerCount, sampleCount, extractedSampleCount}) => <PageContainer>
    <AppPageHeader title="Dashboard" />
    <PageContent style={{padding: "0 24px 24px 24px"}}>
        <Row gutter={16}>
            <Col {...COL_LAYOUT}>
                <Card title="Containers" {...CARD_PROPS}>
                    <Statistic title="Total Containers" value={containerCount || "—"} />
                    <Row gutter={16}>
                        <Col {...BUTTON_COL_PROPS}>
                            <Link to="/containers/add">
                                <Button block={true} icon={<PlusOutlined />}>Add</Button>
                            </Link>
                        </Col>
                        <Col {...BUTTON_COL_PROPS}>
                            <Link to="/containers/move">
                                <Button block={true} icon={<ExportOutlined />}>Move</Button>
                            </Link>
                        </Col>
                    </Row>
                </Card>
            </Col>
            <Col {...COL_LAYOUT}>
                <Card title="Samples" {...CARD_PROPS}>
                    <Statistic title="Total Samples" value={sampleCount || "—"} />
                    <Statistic title="Extracted Samples" value={extractedSampleCount || "—"} />
                    <Row gutter={16}>
                        <Col {...WIDE_BUTTON_COL_PROPS}>
                            <Link to="/samples/add">
                                <Button block={true} icon={<PlusOutlined />}>Add Samples</Button>
                            </Link>
                        </Col>
                        <Col {...WIDE_BUTTON_COL_PROPS}>
                            <Link to="/samples/extract">
                                <Button block={true} icon={<ExperimentOutlined />}>Process Extractions</Button>
                            </Link>
                        </Col>
                        <Col {...WIDE_BUTTON_COL_PROPS}>
                            <Link to="/samples/update">
                                <Button block={true} icon={<EditOutlined />}>Update Samples</Button>
                            </Link>
                        </Col>
                    </Row>
                </Card>
            </Col>
            <Col {...COL_LAYOUT}>
                <Card title="Reporting" {...CARD_PROPS}>
                    <Row gutter={16}>
                        <Col {...WIDE_BUTTON_COL_PROPS}>
                            <Button block={true} icon={<SolutionOutlined />}>User Reports</Button>
                        </Col>
                        <Col {...WIDE_BUTTON_COL_PROPS}>
                            <Button block={true} icon={<ExperimentOutlined />}>Sample Reports</Button>
                        </Col>
                        <Col {...WIDE_BUTTON_COL_PROPS}>
                            <Button block={true} icon={<ProfileOutlined />}>Action Log</Button>
                        </Col>
                    </Row>
                </Card>
            </Col>
        </Row>
    </PageContent>
</PageContainer>;

const mapStateToProps = state => ({
    containerCount: state.containers.serverCount,
    sampleCount: state.samples.serverCount,
    // TODO: Server count for pagination
    extractedSampleCount: state.samples.items.filter(s => s.extracted_from !== null).length,
})

export default connect(mapStateToProps)(DashboardPage);
