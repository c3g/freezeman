import {Button, Form, Upload} from "antd";
import {UploadOutlined} from "@ant-design/icons";
import React from "react";

export const UploadStep = ({action, onChangeFile}) => (
  <Form layout="vertical">
    <Form.Item name="template_upload">
      <div style={{textAlign: "center"}}>
        <Upload
          name="template"
          multiple={false}
          accept=".xlsx"
          beforeUpload={file => { onChangeFile(file); return false }}
          fileList={[]}
        >
          <Button size="large">
            <UploadOutlined /> Upload
          </Button>
        </Upload>
      </div>
    </Form.Item>
  </Form>
);