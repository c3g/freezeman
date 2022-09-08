import React, {useState} from "react";
import {useLocation, useNavigate, Link} from "react-router-dom";
import {Button, Form, Input, Typography} from "antd";
import {
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
const {Text} = Typography;

import api, {withToken} from "../../utils/api";

const resetPassword  = withToken(null, api.auth.resetPassword)
const changePassword = withToken(null, api.auth.changePassword)

const buttonStyle = {
  width: "100%",
}

export default function ResetPasswordForm() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');

  return (
    <>
      {token ?
        <ChangePasswordForm token={token} /> :
        <SendPasswordResetForm />
      }
    </>
  )
}

function SendPasswordResetForm() {
  const [message, setMessage] = useState(undefined);
  const [isFetching, setIsFetching] = useState(false);
  const onFinish = values => {
    setIsFetching(true)
    resetPassword(values.email)
    .then(() => setMessage(true))
    .catch(err => setMessage(err))
    .finally(() => setIsFetching(false))
  }

  return (
    <Form size="large" onFinish={onFinish}>
      <Form.Item name="email" rules={[{required: true}]}>
        <Input
          prefix={<MailOutlined className="site-form-item-icon" />}
          autoComplete="email"
          placeholder="Email"
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isFetching} style={buttonStyle}>
          Reset Password
        </Button>
      </Form.Item>
      <div>
        {message instanceof Error &&
          <Text type="danger">
            {message.toString()}
          </Text>
        }
        {message === true &&
          <Text type="success">
            Email sent. Check your inbox and follow instructions.
          </Text>
        }
      </div>
      <div>
        <Link to="/login">
          Back
        </Link>
      </div>
    </Form>
  )
}

function ChangePasswordForm({token}) {
  const history = useNavigate();
  const [message, setMessage] = useState(undefined);
  const [isFetching, setIsFetching] = useState(false);
  const onFinish = values => {
    setIsFetching(true)
    changePassword(token, values.password)
    .then(() => history("/login"))
    .catch(err => setMessage(err))
    .finally(() => setIsFetching(false))
  }


  return (
    <Form size="large" onFinish={onFinish}>
      <Form.Item name="password" rules={[{required: true}]}>
        <Input.Password
          prefix={<LockOutlined className="site-form-item-icon" />}
          autoComplete="new-password"
          placeholder="New Password"
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isFetching} style={buttonStyle}>
          Change Password
        </Button>
      </Form.Item>
      <div>
        {message instanceof Error &&
          <Text type="danger">
            {message.data?.password?.join(', ') ?? String(message)}
          </Text>
        }
      </div>
    </Form>
  )
}
