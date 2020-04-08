import React, {useState} from "react";
import PropTypes from "prop-types";

import {Button, Form, Steps, Upload} from "antd";
import "antd/es/button/style/css";
import "antd/es/form/style/css";
import "antd/es/steps/style/css";
import "antd/es/upload/style/css";

import {ArrowRightOutlined, CloseOutlined, UploadOutlined} from "@ant-design/icons";

const nop = () => {};

const UploadStep = ({onCancel, onNext}) => (
    <Form layout="vertical">
        <Form.Item label="Container Creation Template" name="template_upload">
            <Upload name="template">
                <Button><UploadOutlined /> Upload</Button>
            </Upload>
        </Form.Item>
        <Form.Item>
            <Button onClick={() => (onCancel || nop)()} style={{marginRight: "8px"}}>
                <CloseOutlined />
                Cancel
            </Button>
            <Button type="primary" onClick={() => (onNext || nop)()}>
                Next
                <ArrowRightOutlined />
            </Button>
        </Form.Item>
    </Form>
);

const ReviewStep = () => (
    <div />
);

const ConfirmationStep = () => (
    <div />
);

const CONTAINER_ADD_STEPS = [
    {
        title: "Upload Template",
        description: uploadText => uploadText || "Upload the provided template.",
        content: UploadStep,
    },
    {
        title: "Review Submission",
        description: () => "Review and fix any warnings or errors before saving to the database.",
        content: ReviewStep,
    },
    {
        title: "Confirmation",
        description: () => "See a report of what was submitted to the database.",
        content: ConfirmationStep,
    },
]

const TemplateFlow = ({uploadText}) => {
    const [step, setStep] = useState(0);

    const StepContent = CONTAINER_ADD_STEPS[step].content;

    return <>
        <Steps current={step}>
            {CONTAINER_ADD_STEPS.map((s, i) =>
                <Steps.Step key={i} title={s.title} description={s.description(uploadText)}/>)}
        </Steps>
        <div style={{padding: "24px 0"}}><StepContent onNext={() => setStep(step + 1)} /></div>
    </>;
};

TemplateFlow.propTypes = {
    uploadText: PropTypes.string
};

export default TemplateFlow;
