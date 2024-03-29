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
      warnings[warning.format] = warnings[warning.format] ?? []
      warnings[warning.format].push({
        args: warning.args,
        row: row.row_repr.substring(1)
      })
    })
  })

  return Object.keys(warnings).length > 0 ? <>
    <h4>WARNINGS:</h4>
    <ul>
      {Object.entries(warnings).sort(([_1, a], [_2, b]) => a.length - b.length).map(([format, array]) => {
        const MAX_ROWS_DISPLAYED = 10
        const warning = format.replace(/\{[0-9]*\}/g, "...")
        const rows = array.map((x) => x.row)
        const extra = rows.length > MAX_ROWS_DISPLAYED ? `... (+${rows.length - MAX_ROWS_DISPLAYED} others)` : ''
        return <li key={format}>
            <Space>
              <Badge count={array.length} style={{backgroundColor: 'gray'}} overflowCount={Number.MAX_SAFE_INTEGER}/>
              {`${warning} (Row # ${rows.slice(0, MAX_ROWS_DISPLAYED).join(", ")}${extra})`}
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
          {row.warnings.map(({key, format, args}, index) => <p key={index}>{`${key} : ${args.reduce((prev, curr, index) => {
            return prev.replace(`{${index}}`, curr)
          }, format)}`}</p>)}
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
