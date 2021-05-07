import React from "react";
import {Link} from "react-router-dom";
import {Button, Form, Input} from "antd";
import {
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";

const layout = {
  wrapperCol: { span: 24 },
}

const buttonStyle = {
  width: "100%",
}

const forgotStyle = {
  marginTop: '0.5em',
}

export default function LoginForm({ isFetching, login }) {

  return (
    <Form {...layout} size="large" name="login" onFinish={login}>
      <Form.Item name="username" rules={[{required: true}]}>
        <Input
          prefix={<UserOutlined className="site-form-item-icon" />}
          autoComplete="username"
          placeholder="Username"
        />
      </Form.Item>
      <Form.Item name="password" rules={[{required: true}]}>
        <Input.Password
          prefix={<LockOutlined className="site-form-item-icon" />}
          autoComplete="current-password"
          placeholder="Password"
        />
      </Form.Item>
      <Form.Item {...layout}>
        <Button type="primary" htmlType="submit" loading={isFetching} style={buttonStyle}>
          Login
        </Button>
        <div className='flex-row' style={forgotStyle}>
          <div className='flex-fill' />
          <Link to="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </Form.Item>
    </Form>
  )
}
