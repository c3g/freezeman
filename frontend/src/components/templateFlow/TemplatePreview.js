import React from "react";
import {Popover, Table, Tabs, Badge, Space} from "antd";
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
            {!checkResult.valid && renderResultWithErrors(preview)}
            {renderResultWithWarnings(preview)}
            {renderPreviewSheetTable(preview)}
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
        <li key={'row-' + index}>
          Row {row.row_repr}: {e.error}
        </li>
      )
    })
    row.validation_error?.forEach(field => {
      field[1].forEach(reason => {
        errors.push(
          <li key={'row-' + index + field[0] + reason}>
            Row {row.row_repr}: {field[0]} - {reason}
          </li>
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
            <ul>
            {errors}
            </ul>
          </p>
        }
    </>
  )
}

const renderResultWithWarnings = (previewSheetInfo) => {
  const warnings = {}
  previewSheetInfo.rows?.forEach((row) => {
    row.warnings.forEach((warning) => {
      warnings[warning] = warnings[warning] ?? []
      warnings[warning].push(row.row_repr.substring(1))
    })
  })

  return Object.keys(warnings).length > 0 ? <>
    <h4>WARNINGS:</h4>
    <ul>
      {Object.entries(warnings).sort(([_1, a], [_2, b]) => a.length - b.length).map(([warning, row_numbers]) => {
        return <li key={warning}>
            <Space>
              <Badge count={row_numbers.length} style={{backgroundColor: 'gray'}}/>
              {`${warning} (Row # ${row_numbers.join(", ")})`}
            </Space>
          </li>
      })}
    </ul>
  </> : null
}

const renderPreviewSheetTable = (previewSheetInfo) => {
  const results = []
  const columns = []

  columns.push(
    {
      title: '',
      dataIndex: 'warning',
      key: 'warning',
      align: "center",
      fixed: "left",
      render: content => {
        return (content &&
          <Popover content={content} title='Warnings on current row' placement='bottomLeft'>
            <div style={{width: '40px'}}>
              <Badge count={content.props.children.length} color='gray' size='small'>
                <WarningOutlined style={{fontSize: '22px', color: '#FFBB00'}}/>
              </Badge>
            </div>
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
      row_data['warning'] = (
        <div key={`warning-${index}`}>
          {row.warnings.map(warning => <p>{warning}</p>)}
        </div>
      )
    )

    row.diff.forEach((diff, diff_index) => {
      row_data[`column-${diff_index}`] = innerHTMLPurified(diff)
    })
    results.push(row_data)
  })

  return <>
    <Table dataSource={results} columns={columns} scroll={{ x: true }} size="small" bordered/>
  </>
}
