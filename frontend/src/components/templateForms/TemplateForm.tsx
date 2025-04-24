import {Form} from "antd";
import {UploadOutlined} from "@ant-design/icons";
import React from "react";
import { EditableCell } from "./EditableCell";


export const TemplateForm = ({action, onChangeFile}) => (
  <Form layout="vertical">
    <EditableCell editable={true}/>
  </Form>
);