import React from "react";
import DOMPurify from 'dompurify';


export default function innerHTMLPurified(s) {
  const purifiedStr = DOMPurify.sanitize(s.toString())
  return <div dangerouslySetInnerHTML={{__html: purifiedStr}}/>;
}
