import {Alert} from "antd";
import React from "react";
import {TemplatePreview} from "../TemplatePreview";

export const ReviewStep = ({action, actionIndex, isChecking, isChecked, checkResult}) => (
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
            {/*{checkResult.rows.length} row(s) found*/}
            <TemplatePreview checkResult={checkResult} />
          </>

        }
        type={checkResult.has_warnings?"warning":"success"}
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
            <TemplatePreview checkResult={checkResult} />
          </>
        }
        type="error"
        showIcon
      />
    }
  </div>
);