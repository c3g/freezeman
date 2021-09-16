import {Alert} from "antd";
import React from "react";
import {TemplatePreview} from "../TemplatePreview";

export const ConfirmationStep = ({isSubmitting, isSubmitted, submitResult}) => (
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
            <TemplatePreview checkResult={submitResult} />
          </>
        }
        type="error"
        showIcon
      />
    }
  </div>
);