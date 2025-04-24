import React from "react";
import { Form, Input } from "antd";

interface EditableCellProps {
  editable: boolean
}

export const EditableCell = ({editable}: EditableCellProps) => {

  return (
    <>
      <Form.Item style={{ margin: 0 }}>
        <Input style={{ width: '100%' }}/>
      </Form.Item>
    </>
  )
}