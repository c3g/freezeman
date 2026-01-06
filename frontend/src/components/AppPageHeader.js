import React from "react";
import { Row, Col, Typography, ConfigProvider, Space } from "antd";

const style = {
  backgroundColor: "rgba(0, 0, 0, 0.03)",
  borderBottom: "1px solid #ccc",
  padding: "1em",
};

/**
 * 
 * @param {{ title: string, extra?: React.ReactNode }} param0 
 * @returns 
 */
const AppPageHeader = ({...props}) =>  (
  <Row style={style} justify={"space-between"} align={"middle"}>
      <Col flex={"none"}>
        <ConfigProvider
          theme={{
            components: {
              Typography: {
                titleMarginTop: 0,
                titleMarginBottom: 0,
              },
            },
          }}
        >
          <Typography.Title level={3} style={{ marginTop: 0 }}>
            {props.title}
          </Typography.Title>
        </ConfigProvider>
      </Col>
      <Col flex={"auto"} align={"right"}>
        <Space size={'small'}>
          {props.extra}
        </Space>
      </Col>
    </Row>
)

export default AppPageHeader;
