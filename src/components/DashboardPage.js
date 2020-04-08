import React from "react";

import {Button, Card, Col, Row, Statistic} from "antd";
import "antd/es/button/style/css";
import "antd/es/card/style/css";
import "antd/es/col/style/css";
import "antd/es/row/style/css";
import "antd/es/statistic/style/css";

import {EditOutlined, ExperimentOutlined, ExportOutlined, PlusOutlined, UserOutlined} from "@ant-design/icons";

import AppPageHeader from "./AppPageHeader";

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

const DashboardPage = () => (
    <div style={{height: "100%", backgroundColor: "white", overflowY: "auto"}}>
        <AppPageHeader title="Dashboard" />
        <div style={{padding: "0 24px 24px 24px"}}>
            <Row gutter={16}>
                <Col {...COL_LAYOUT}>
                    <Card title="Containers" {...CARD_PROPS}>
                        <Statistic title="Total Containers" value={234} />
                        <Row gutter={16}>
                            <Col {...BUTTON_COL_PROPS}>
                                <Button block={true} icon={<PlusOutlined />}>Add</Button>
                            </Col>
                            <Col {...BUTTON_COL_PROPS}>
                                <Button block={true} icon={<ExportOutlined />}>Move</Button>
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col {...COL_LAYOUT}>
                    <Card title="Samples" {...CARD_PROPS}>
                        <Statistic title="Total Samples" value={1450} />
                        <Statistic title="Extracted Samples" value={322} />
                        <Row gutter={16}>
                            <Col {...WIDE_BUTTON_COL_PROPS}>
                                <Button block={true} icon={<PlusOutlined />}>Add Samples</Button>
                            </Col>
                            <Col {...WIDE_BUTTON_COL_PROPS}>
                                <Button block={true} icon={<ExperimentOutlined />}>Process Extractions</Button>
                            </Col>
                            <Col {...WIDE_BUTTON_COL_PROPS}>
                                <Button block={true} icon={<EditOutlined />}>Update Samples</Button>
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col {...COL_LAYOUT}>
                    <Card title="Reporting" {...CARD_PROPS}>
                        <Row gutter={16}>
                            <Col {...WIDE_BUTTON_COL_PROPS}>
                                <Button block={true} icon={<UserOutlined />}>User Reports</Button>
                            </Col>
                            <Col {...WIDE_BUTTON_COL_PROPS}>
                                <Button block={true} icon={<ExperimentOutlined />}>Sample Reports</Button>
                            </Col>
                            <Col {...WIDE_BUTTON_COL_PROPS}>
                                <Button block={true}>Action Log</Button>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        </div>
    </div>
);

export default DashboardPage;
