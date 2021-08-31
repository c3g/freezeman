import React from "react";
import {Popover, Table, Tabs} from "antd";
import {WarningOutlined} from "@ant-design/icons";
import innerHTMLPurified from "../../utils/innerHTMLPurified";

const {TabPane} = Tabs;

export const TemplatePreview = ({checkResult}) => {
 return <>
    <p>
       {checkResult?.error?.message}
    </p>
    { checkResult?.base_errors?.length > 0 && checkResult.base_errors.map(baseError =>
        <p>
          {baseError.error}
        </p>)
    }
    <Tabs size="large" type="card">
      {checkResult.result_previews?.map((preview, index) =>
         <TabPane tab={preview.name} key={index}>
           { checkResult.valid &&
              renderPreviewSheetTable(preview)
           }
           { !checkResult.valid && renderResultWithErrors(preview)}
         </TabPane>
      )}
    </Tabs>
 </>
  
}

const renderResultWithErrors = (previewSheetInfo) => {
  const errors = []

  previewSheetInfo.rows?.forEach((row, index) => {
    row.errors.forEach(e => {
      errors.push(
        <div key={'row-' + index}>
          Row {row.row_repr}: {e.error}
        </div>
      )
    })
    row.validation_error?.forEach(field => {
      field[1].forEach(reason => {
        errors.push(
          <div key={'row-' + index + field[0] + reason}>
            Row {row.row_repr}: {field[0]} - {reason}
          </div>
        )
      })
    })
  })

  return (
      <>
        { previewSheetInfo.error &&
          <pre>
            {previewSheetInfo.error.message}
          </pre>
        }
        { errors.length > 0 &&
          <p>
            <h4>ERRORS: </h4>
            {errors}
          </p>
        }
        <p>
          {renderPreviewSheetTable(previewSheetInfo)}
        </p>
    </>
  )
}

const renderPreviewSheetTable = (previewSheetInfo) => {
  const results = []
  const columns = []

  previewSheetInfo.has_warnings && columns.push(
    {
      title: 'Warnings',
      dataIndex: 'warning',
      key: 'warning',
      align: "center",  
      render: content => {
        return (content &&
          <Popover content={content} title='Warnings on current row' placement='bottomLeft'>
            <WarningOutlined style={{fontSize: '16px', color: '#FFBB00'}}/>
          </Popover>)
      },
    })

  previewSheetInfo.headers?.forEach((diff_header, index) => {
    let columnContent = {
      title: diff_header,
      dataIndex: `column-${index}`,
      key: `column-${index}`,
    }
    if (index == 0) {
      columnContent.fixed = 'left'
    }

    columns.push(columnContent)
  })

  previewSheetInfo.rows.forEach((row, index) => {
    let row_data = {}

    row.warnings.length > 0 && (
        row_data['warning'] = () => {
          <div key={`warning-${index}`}>
            {row.warnings.map(warning => <p>{warning}</p>)}
          </div>
        }
    )

    console.log(row)
    console.log(row_data['warning'])

    row.diff.forEach((diff, diff_index) => {
      row_data[`column-${diff_index}`] = innerHTMLPurified(diff)
    })
    results.push(row_data)
  })

  return <>
    <Table dataSource={results} columns={columns} scroll={{ x: true }} size="small" bordered/>
  </>
}
