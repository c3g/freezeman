import React from "react"
import { Typography } from "antd"

const { Paragraph } = Typography

export default function renderTextWithLineBreaks (text: string, ellipsis: boolean=false) {
  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      <Paragraph ellipsis={ellipsis ? { rows: 2, expandable: true, symbol: "more" } : false}>
        {text}
      </Paragraph>
    </div>
  )
}