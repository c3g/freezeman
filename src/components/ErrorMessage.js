import React from "react";

import {Alert} from "antd";
import "antd/es/alert/style/css";

const ErrorMessage = ({title, description, error}) =>
  <Alert
    message={title || "An error occurred"}
    description={
      <>
        {description}
        {error &&
          <>
            {error.message}
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {error.stack}
            </pre>
          </>
        }
      </>
    }
    type="error"
    showIcon
  />;

export default ErrorMessage;
