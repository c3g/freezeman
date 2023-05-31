import React, { useState } from "react";
import { connect } from "react-redux"
import PropTypes from "prop-types";
import { Button, Steps, Row, Col, notification } from "antd";
import { downloadFromFile } from "../../utils/download";

import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
} from "@ant-design/icons";

import { fetchListedData, fetchSummariesData } from "../../modules/shared/actions";

import { UploadStep } from "./steps/UploadStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ConfirmationStep } from "./steps/ConfirmationStep";


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
STEPS.UPLOAD = 0
STEPS.REVIEW = 1
STEPS.CONFIRM = 2

const actionCreators = { fetchListedData, fetchSummariesData };

const TemplateFlow = ({ fetchListedData, fetchSummariesData, ...props }) => {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const { action, actionIndex, checkRequest, submitRequest, goBack } = props;
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
        if (response.filename)
          downloadFromFile(response.filename, response.data)
        setSubmitResult({ valid: true });
      })
      .catch(error => {
        if (error.message === 'Failed to fetch') {
          // If the template file was changed on disk since it was uploaded
          // then a 'failed to fetch' error is thrown. This can happen if the user saves a change to
          // the template after it has been uploaded.
          notification.error({
            message: 'Template Has Changed',
            description: 'The template has changed since it was uploaded and cannot be submitted. Please upload the template again, and ensure that it is not saved or otherwise modified until after it has been submitted.',
            duration: 0
          })
        }
        setSubmitResult({
          valid: false,
          error,
        })
      })
      .then(fetchListedData)
      .then(fetchSummariesData)
      .finally(() => {
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

    <div style={{ padding: "24px 0", minHeight: "150px" }}>
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
          onClick={() => setStep(step - 1)} style={{ marginRight: "8px" }}
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
            disabled={!checkResult || !checkResult.valid}
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

export default connect(undefined, actionCreators)(TemplateFlow);
