import React from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";

import { Card, Col, Row } from "antd";

import itemRender from "../../utils/breadcrumbItemRender";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import AutocompleteReport from "./AutocompleteReport";
import routes from "./routes";
import reports from "./list";

const cardStyle = {
  marginBottom: "1em",
}

const mapStateToProps = state => ({state});

const ReportsListContent = ({state}) => {
  const history = useHistory();

  return (
    <>
      <AppPageHeader
        title="Reports"
        breadcrumb={{routes, itemRender}}
      />
      <PageContent>
        <Row>
          {reports.map(report =>
            <Col key={report.path} md={24} lg={18}>
              <Card
                style={cardStyle}
                type="inner"
                title={<>
                  {report.icon} {report.title}
                </>}
              >
                <p>
                  {report.description}
                </p>
                <AutocompleteReport
                  data={report.selector(state)}
                  searchKeys={report.searchKeys}
                  renderItem={report.renderItem}
                  onSelect={itemId => {
                    history.push(`${report.path}/${itemId}`)
                  }}
                />
              </Card>
            </Col>
          )}
        </Row>
      </PageContent>
    </>
  );
}

export default connect(mapStateToProps)(ReportsListContent);
