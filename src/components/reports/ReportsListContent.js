import React from "react";
import { Link } from "react-router-dom";

import { Card, Col, Row } from "antd";

import itemRender from "../../utils/breadcrumbItemRender";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import routes from "./routes";
import reports from "./list";

const { Meta } = Card;

const ReportsListContent = () => <>
  <AppPageHeader
    title="Reports"
    breadcrumb={{routes, itemRender}}
  />
  <PageContent>
    <Row gutter={16}>
      {reports.map(report =>
        <Col span={8}>
          <Card
            key={report.path}
            title={report.title}
            extra={<Link to={report.path}>Open</Link>}
          >
            {report.description}
          </Card>
        </Col>
      )}
    </Row>
  </PageContent>
</>;

export default ReportsListContent;
