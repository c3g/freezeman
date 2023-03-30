import React from "react";

const FileNameCopyPath = ({fullPath}) => {
  if (!fullPath)
    return ""

  const filename = fullPath.split("/").pop()
  if (filename.length == fullPath.length) {
    return fullPath
  }
  else {
    const onClick = () => {
      if (!navigator.clipboard) {
        return;
      }
      navigator.clipboard.writeText(fullPath)
      .then(function() {
        console.log('Copying to clipboard was successful!');
      }, function(err) {
        console.error('Could not copy text: ', err);
      });
    }

    return (
      <div title={fullPath}>
        {filename}
        <Tooltip title="Copy full path to clipboard">
            <SnippetsOutlined onClick={onClick} />
        </Tooltip>
      </div>
    )
  }
}

export default FileNameCopyPath;