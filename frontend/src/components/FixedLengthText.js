import React from "react";

const FixedLengthText = ({text, fixedLength, elipsis='...'}) => {
  if (!text)
    return ""
  if (text.length < fixedLength) {
    return text
  }
  else {
    return (
      <div title={text}>
        {text.slice(0, fixedLength - elipsis.length) + elipsis}
      </div>
    )
  }
}

export default FixedLengthText;