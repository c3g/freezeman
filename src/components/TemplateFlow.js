import React, {useState} from "react";
import PropTypes from "prop-types";

import {Alert, Button, Form, Steps, Upload, Row, Col} from "antd";
import "antd/es/alert/style/css";
import "antd/es/button/style/css";
import "antd/es/form/style/css";
import "antd/es/steps/style/css";
import "antd/es/upload/style/css";
import "antd/es/row/style/css";
import "antd/es/col/style/css";

import {ArrowRightOutlined, ArrowLeftOutlined, UploadOutlined} from "@ant-design/icons";


function renderResult(result) {
  if (result.error)
    return (
      <pre>
        {result.error.message}
      </pre>
    )

  const errors = []

  result.rows.forEach((row, index) => {
    row.errors.forEach(e => {
      errors.push(
        <div key={'row-' + index}>
          Row {index}: {e.error}
        </div>
      )
    })
  })

  return errors
}

const UploadStep = ({action, onChangeFile}) => (
  <Form layout="vertical">
    <Form.Item name="template_upload">
      <div style={{textAlign: "center"}}>
        <Upload
          name="template"
          multiple={false}
          accept={getExtension(action.template)}
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

const ReviewStep = ({action, actionIndex, isChecking, isChecked, result}) => (
  <div>
    {isChecking &&
      <Alert
        message="Validating"
        description="Please wait while we validate your template..."
        type="warning"
        showIcon
      />
    }
    {isChecked && result.valid &&
      <Alert
        message="Template validated"
        description={
          <>
            No errors were found while validating your template.
            {result.rows.length} row(s) found
          </>

        }
        type="success"
        showIcon
      />
    }
    {isChecked && !result.valid &&
      <Alert
        message="Template validated"
        description={
          <>
            <p>
              Errors were found while validating your template.
            </p>
            {renderResult(result)}
          </>
        }
        type="error"
        showIcon
      />
    }
  </div>
);

const ConfirmationStep = () => (
  <div />
);

const STEPS = [
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

const TemplateFlow = (props) => {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);

  const {action, actionIndex, checkRequest} = props;
  const StepContent = STEPS[step].content;

  if (file && !isChecked && !isChecking) {
    setIsChecking(true)
    checkRequest(actionIndex, file)
    .then(response => {
      setResult(response.data)
    })
    .catch(error => {
      setResult({
        valid: false,
        error,
      })
    })
    .then(() => {
      setIsChecked(true)
      setIsChecking(false)
    })
  }

  const onChangeFile = file => {
    setIsChecked(false)
    setIsChecking(false)
    setFile(file)
    setStep(step + 1)
  }

  return <>
    <Steps current={step}>
      {STEPS.map((s, i) =>
        <Steps.Step
          key={i}
          title={s.title}
          description={s.description(action.description)}
        />
      )}
    </Steps>

    <div style={{padding: "24px 0", minHeight: "150px"}}>
      <StepContent
        file={file}
        result={result}
        isChecked={isChecked}
        isChecking={isChecking}
        onChangeFile={onChangeFile}
        {...props}
      />
    </div>

    <Row>
      <Col>
        <Button
          disabled={step === 0}
          onClick={() => setStep(step - 1)} style={{marginRight: "8px"}}
        >
          <ArrowLeftOutlined /> Previous
        </Button>
      </Col>
      <Col flex="1"></Col>
      <Col>
        <Button
          type="primary"
          disabled={
            step === STEPS.length - 1 ||
            (step === 0 && !file) ||
            (step === 1 && (!result || !result.valid))
          }
          onClick={() => setStep(step + 1)}
        >
          Next <ArrowRightOutlined />
        </Button>
      </Col>
    </Row>
  </>;
};

TemplateFlow.propTypes = {
  uploadText: PropTypes.string,
};

export default TemplateFlow;


function getExtension(filepath) {
  return filepath.slice(filepath.lastIndexOf('.'))
}
