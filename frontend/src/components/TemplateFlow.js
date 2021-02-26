import React, {useState} from "react";
import PropTypes from "prop-types";
import {Alert, Button, Form, Steps, Upload, Row, Col} from "antd";

import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  UploadOutlined,
} from "@ant-design/icons";


function renderResult(checkResult) {
  if (checkResult.error)
    return (
      <pre>
        {checkResult.error.message}
      </pre>
    )

  const errors = []

  checkResult.rows.forEach((row, index) => {
    row.errors.forEach(e => {
      errors.push(
        <div key={'row-' + index}>
          Row {index}: {e.error}
        </div>
      )
    })
    row.validation_error?.forEach(field => {
      field[1].forEach(reason => {
        errors.push(
          <div key={'row-' + index + field[0] + reason}>
            Row {index}: {field[0]} - {reason}
          </div>
        )
      })
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
          accept=".xlsx,.csv"
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

const ReviewStep = ({action, actionIndex, isChecking, isChecked, checkResult}) => (
  <div>
    {isChecking &&
      <Alert
        message="Validating"
        description="Please wait while we validate your template..."
        type="warning"
        showIcon
      />
    }
    {isChecked && checkResult.valid &&
      <Alert
        message="Template validated"
        description={
          <>
            No errors were found while validating your template:
            {checkResult.rows.length} row(s) found
          </>

        }
        type="success"
        showIcon
      />
    }
    {isChecked && !checkResult.valid &&
      <Alert
        message="Template validated"
        description={
          <>
            <p>
              Errors were found while validating your template :(
            </p>
            {renderResult(checkResult)}
          </>
        }
        type="error"
        showIcon
      />
    }
  </div>
);

const ConfirmationStep = ({isSubmitting, isSubmitted, submitResult}) => (
  <div>
    {isSubmitting &&
      <Alert
        message="Submitting..."
        description="Please wait while we submit your template..."
        type="warning"
        showIcon
      />
    }
    {isSubmitted && submitResult.valid &&
      <Alert
        message="Template submitted"
        description={
          <>
            Your template was submitted succesfully :)
          </>

        }
        type="success"
        showIcon
      />
    }
    {isSubmitted && !submitResult.valid &&
      <Alert
        message="Template submitted"
        description={
          <>
            <p>
              Errors were found while submitting your template :(
            </p>
            {renderResult(submitResult)}
          </>
        }
        type="error"
        showIcon
      />
    }
  </div>
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
STEPS.UPLOAD  = 0
STEPS.REVIEW  = 1
STEPS.CONFIRM = 2

const TemplateFlow = (props) => {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const {action, actionIndex, checkRequest, submitRequest, goBack} = props;
  const StepContent = STEPS[step].content;

  if (file && !isChecked && !isChecking) {
    setIsChecking(true)
    checkRequest(actionIndex, file)
    .then(response => {
      setCheckResult(response.data)
    })
    .catch(error => {
      setCheckResult({
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

  const onSubmit = () => {
    setIsSubmitting(true)
    submitRequest(actionIndex, file)
    .then(response => {
      setSubmitResult({ valid: true })
    })
    .catch(error => {
      setSubmitResult({
        valid: false,
        error,
      })
    })
    .then(() => {
      setIsSubmitted(true)
      setIsSubmitting(false)
    })
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
        isChecked={isChecked}
        isChecking={isChecking}
        checkResult={checkResult}
        isSubmitted={isSubmitted}
        isSubmitting={isSubmitting}
        submitResult={submitResult}
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
        {
          step === STEPS.UPLOAD &&
            <Button
              type="primary"
              disabled={
                step === STEPS.length - 1 ||
                (step === STEPS.UPLOAD && !file)
              }
              onClick={() => setStep(step + 1)}
            >
              Next <ArrowRightOutlined />
            </Button>
        }
        {
          step === STEPS.REVIEW &&
            <Button
              type="primary"
              disabled={false}
              onClick={onSubmit}
            >
              <CheckOutlined /> Submit
            </Button>
        }
        {
          step === STEPS.CONFIRM &&
            <Button
              type="primary"
              onClick={goBack}
            >
              <CheckOutlined /> Go Back
            </Button>
        }
      </Col>
    </Row>
  </>;
};

TemplateFlow.propTypes = {
  uploadText: PropTypes.string,
};

export default TemplateFlow;
