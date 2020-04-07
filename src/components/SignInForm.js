import React from "react";

import {Button, Form, Input} from "antd";
import "antd/es/button/style/css";
import "antd/es/form/style/css";
import "antd/es/input/style/css";

const SignInForm = () => (
    <Form layout="vertical" name="sign-in">
        <Form.Item label="Username" name="username" rules={[{required: true}]}>
            <Input />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{required: true}]}>
            <Input.Password />
        </Form.Item>
        <Form.Item>
            <Button type="primary" htmlType="submit">Sign In</Button>
        </Form.Item>
    </Form>
);

export default SignInForm;
