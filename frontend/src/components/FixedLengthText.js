import React from "react";

export const END_ELIPSIS = 'end'
export const MIDDLE_ELIPSIS = 'middle'
const ENDING_LENGTH = 7 // This length was chosen to map to the quote identifier used in some projects names. It may be too long.

const FixedLengthText = ({text, fixedLength, elipsisPosition=END_ELIPSIS, elipsis='...'}) => {
  if (!text)
    return ""
  if (text.length < fixedLength) {
    return text
  }
  else if (elipsisPosition.toLowerCase() === MIDDLE_ELIPSIS) {
    const textLength = fixedLength - elipsis.length - ENDING_LENGTH > 0 ? fixedLength - elipsis.length - ENDING_LENGTH : 0
    // If fixedLength is too small, we favor the end part cutting the start to zero length to keep this simpler
    const textAfterElipsis = elipsis.length + ENDING_LENGTH > fixedLength ? elipsis.length > fixedLength ? "" : text.slice(-(fixedLength - elipsis.length)) : text.slice(-ENDING_LENGTH)
    return (
      <div title={text}>
        {text.slice(0, textLength) + elipsis + textAfterElipsis}
      </div>
    )
  }
  else {
    const textLength = fixedLength - elipsis.length > 0 ? fixedLength - elipsis.length : 0
    return (
      <div title={text}>
        {text.slice(0, textLength) + elipsis}
      </div>
    )
  }
}

export default FixedLengthText