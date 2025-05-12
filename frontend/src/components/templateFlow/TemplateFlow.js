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

import { TemplateForm } from "../templateForms/TemplateForm";
import { UploadStep } from "./steps/UploadStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ConfirmationStep } from "./steps/ConfirmationStep";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { selectStepsByID } from '../../selectors'

const actionCreators = { fetchListedData, fetchSummariesData };

const TemplateFlow = ({ fetchListedData, fetchSummariesData, ...props }) => {
  const { stepID: workflowStepId } = useParams(selectStepsByID)
  const workflowStep = useAppSelector(selectStepsByID)[workflowStepId]
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const { action, actionIndex, checkRequest, submitRequest } = props;

  const UPLOAD = { 
    title: "Upload File",
    description: uploadText => uploadText || "Upload the provided template.",
    content: UploadStep,
  }

  const WEB_FORM = {
    title: "Fill Form",
    description: () => "Complete the form with required information.",
    content: TemplateForm,
  }

  
  const STEP_UPLOAD = 0
  const STEP_REVIEW = 1
  const STEP_CONFIRM = 2

  const STEPS = [
    (step === STEP_UPLOAD && workflowStep.use_web_form) ? WEB_FORM : UPLOAD,
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
          const description = 
            <div>
              <p>The file has changed since it was uploaded and cannot be submitted.</p>
              <p>Please upload the file again, and ensure that it is not saved or otherwise modified until after it has been submitted.</p>
            </div>
          notification.error({
            message: 'File Has Changed',
            description,
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
          step === STEP_UPLOAD &&
          <Button
            type="primary"
            disabled={
              step === STEPS.length - 1 ||
              (step === STEP_UPLOAD && !file)
            }
            onClick={() => setStep(step + 1)}
          >
            Next <ArrowRightOutlined />
          </Button>
        }
        {
          step === STEP_REVIEW &&
          <Button
            type="primary"
            disabled={!checkResult || !checkResult.valid}
            onClick={onSubmit}
          >
            <CheckOutlined /> Submit
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