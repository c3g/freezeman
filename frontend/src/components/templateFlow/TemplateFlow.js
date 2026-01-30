import React, { useMemo, useState } from "react";
import { Button, Steps, Row, Col, notification, Flex } from "antd";
import { downloadFromFile } from "../../utils/download";

import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
} from "@ant-design/icons";

import { fetchSummariesData } from "../../modules/shared/actions";

import { UploadStep } from "./steps/UploadStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ConfirmationStep } from "./steps/ConfirmationStep";
import { useAppDispatch } from "../../hooks";


const STEPS = [
  {
    title: "Upload File",
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

/**
 * 
 * @param {{
 * action: import("../../models/fms_api_models").FMSTemplateAction,
 * actionIndex: number,
 * checkRequest: (actionIndex: number, file: any) => Promise<any>,
 * submitRequest: (actionIndex: number, file: any) => Promise<any>,
 * }} props 
 * @returns
 */
const TemplateFlow = (props) => {
  const dispatch = useAppDispatch()

  const { action, actionIndex, checkRequest, submitRequest } = props;

  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const StepContent = STEPS[currentStep].content;

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
    setCurrentStep(currentStep + 1)
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
      .then(() => dispatch(fetchSummariesData()))
      .finally(() => {
        setIsSubmitted(true)
        setIsSubmitting(false)
      })
    setCurrentStep(currentStep + 1)
  }

  const stepsItems = useMemo(() => {
    /**
     * @type {NonNullable<import("antd").StepsProps['items']>}
     */
    const steps = STEPS.map((s) => ({
      title: s.title,
      description: s.description(action.description),
    }))
    return steps
  }, [action.description])

  return <>
    <Steps current={currentStep} items={stepsItems} />

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

    <Flex justify={"space-between"}>
        <Button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(currentStep - 1)} style={{ marginRight: "8px" }}
        >
          <ArrowLeftOutlined /> Previous
        </Button>
        {
          currentStep === STEPS.UPLOAD
          ? <Button
            type="primary"
            disabled={
              currentStep === STEPS.length - 1 ||
              (currentStep === STEPS.UPLOAD && !file)
            }
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            Next <ArrowRightOutlined />
          </Button>
          : null
        }
        {
          currentStep === STEPS.REVIEW
          ? <Button
            type="primary"
            disabled={!checkResult || !checkResult.valid}
            onClick={onSubmit}
          >
            <CheckOutlined /> Submit
          </Button>
          : null
        }
    </Flex>
  </>
}

export default TemplateFlow