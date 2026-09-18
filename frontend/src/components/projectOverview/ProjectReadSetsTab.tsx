import React, { useState } from "react"
import dayjs, { Dayjs } from "dayjs"
import ExternalIDReadSetDashboard from "./ExternalIDReadSetDashboard"

import type { ColumnsType } from "antd/es/table"
import type { FilterDropdownProps } from "antd/es/table/interface"
import { Button, DatePicker, Input, Table, Tag, Typography } from "antd"
import { CopyOutlined, SearchOutlined, CheckCircleTwoTone, FilterOutlined } from "@ant-design/icons"
import LaneValidationStatus from "../experimentRuns/LaneValidationStatus"
import { ValidationStatus } from "../../modules/experimentRunLanes/models"

const { Text } = Typography

interface ProjectReadSetsTabProps {
  parentProjectId: number | null
  externalID: string
}
const compactHeaderCell = () => ({
  style: {
    padding: "4px 8px",
    lineHeight: "16px",
    height: 20,
  },
})

const nowrapCell = {
  style: {
    whiteSpace: "nowrap",
  },
}

function CopyableReadsetFilePath({ file }: { file: string }) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  const handleCopy = async (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    await navigator.clipboard.writeText(file)
    setCopiedToClipboard(true)

    setTimeout(() => {
      setCopiedToClipboard(false)
    }, 2000)
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span>{file}</span>
      <Button
        type="text"
        size="small"
        onClick={handleCopy}
        icon={copiedToClipboard ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <CopyOutlined />}
      />
    </div>
  )
}

const getProjectOverviewReadsetColumns = (
  libraryTypeFilters: { text: string; value: string }[],
): ColumnsType<ProjectOverviewReadset> => [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    //fixed: 'left',
    width: 70,
    onHeaderCell: compactHeaderCell,
    onCell: () => nowrapCell,
    render: (id: number) => <Text code>{id}</Text>,
  },
  {
    title: "Readset",
    dataIndex: "name",
    key: "name",
    //fixed: 'left',
    width: 450,
    onHeaderCell: compactHeaderCell,
    render: (name: string) => <Text strong>{name}</Text>,
  },
  {
    title: "Sample",
    dataIndex: "readset_sample_name",
    key: "readset_sample_name",
    width: 450,
    onHeaderCell: compactHeaderCell,
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
    ),
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: FilterDropdownProps) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder="Search sample"
          value={selectedKeys[0]}
          onChange={(event) => {
            setSelectedKeys(event.target.value ? [event.target.value] : [])
          }}
          onPressEnter={() => confirm()}
          style={{
            marginBottom: 8,
            display: "block",
          }}
        />

        <Button
          type="primary"
          size="small"
          onClick={() => confirm()}
          style={{
            width: 90,
            marginRight: 8,
          }}
        >
          Search
        </Button>

        <Button
          size="small"
          onClick={() => {
            clearFilters?.()
            confirm()
          }}
          style={{ width: 90 }}
        >
          Reset
        </Button>
      </div>
    ),
    onFilter: (value, record) =>
      String(record.readset_sample_name ?? "")
        .toLowerCase()
        .includes(String(value).toLowerCase()),
  },
  {
    title: "Alias",
    dataIndex: "alias",
    key: "alias",
    width: 450,
    onHeaderCell: compactHeaderCell,
    render: (alias: string | null) => alias || <Text type="secondary">N/A</Text>,
  },
  {
    title: "Cohort",
    dataIndex: "cohort",
    key: "cohort",
    width: 120,
    onHeaderCell: compactHeaderCell,
    render: (cohort: string | null) => cohort || <Text type="secondary">N/A</Text>,
  },
  {
    title: "Library Type",
    dataIndex: "library_type",
    key: "library_type",
    width: 140,
    onHeaderCell: compactHeaderCell,
    filters: libraryTypeFilters,
    filterIcon: (filtered) => (
      <FilterOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
    ),
    onFilter: (value, record) => record.library_type === value,
    render: (libraryType: string | null) =>
      libraryType ? <Tag>{libraryType}</Tag> : <Text type="secondary">N/A</Text>,
  },
  {
    title: "Run",
    dataIndex: "run_name",
    key: "run_name",
    width: 260,
    onHeaderCell: compactHeaderCell,
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
    ),
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: FilterDropdownProps) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder="Search run"
          value={selectedKeys[0]}
          onChange={(event) => {
            setSelectedKeys(event.target.value ? [event.target.value] : [])
          }}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Button
          type="primary"
          size="small"
          onClick={() => confirm()}
          style={{ width: 90, marginRight: 8 }}
        >
          Search
        </Button>
        <Button
          size="small"
          onClick={() => {
            clearFilters?.()
            confirm()
          }}
          style={{ width: 90 }}
        >
          Reset
        </Button>
      </div>
    ),

    onFilter: (value, record) =>
      String(record.run_name ?? "")
        .toLowerCase()
        .includes(String(value).toLowerCase()),
  },
  {
    title: "Run Start",
    dataIndex: "run_start_date",
    key: "run_start_date",
    width: 120,
    onHeaderCell: compactHeaderCell,
    filterIcon: (filtered) => (
      <FilterOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
    ),
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: FilterDropdownProps) => (
      <div style={{ padding: 8 }}>
        <DatePicker.RangePicker
          style={{ marginBottom: 8, display: "block" }}
          value={
            selectedKeys.length === 1
              ? (() => {
                  const [startDate, endDate] = String(selectedKeys[0]).split("|")

                  return startDate && endDate
                    ? ([dayjs(startDate), dayjs(endDate)] as [Dayjs, Dayjs])
                    : null
                })()
              : null
          }
          onChange={(dates) => {
            if (!dates || !dates[0] || !dates[1]) {
              setSelectedKeys([])
              return
            }

            setSelectedKeys([`${dates[0].format("YYYY-MM-DD")}|${dates[1].format("YYYY-MM-DD")}`])
          }}
        />
        <Button
          type="primary"
          size="small"
          onClick={() => confirm()}
          style={{ width: 90, marginRight: 8 }}
        >
          Filter
        </Button>
        <Button
          size="small"
          onClick={() => {
            clearFilters?.()
            confirm()
          }}
          style={{ width: 90 }}
        >
          Reset
        </Button>
      </div>
    ),

    onFilter: (value, record) => {
      const [startDate, endDate] = String(value).split("|")

      if (!startDate || !endDate) {
        return true
      }

      return record.run_start_date >= startDate && record.run_start_date <= endDate
    },
  },
  {
    title: "Validation Status",
    dataIndex: "run_validation_status",
    key: "run_validation_status",
    width: 170,
    onHeaderCell: compactHeaderCell,
    render: (validationStatus: ValidationStatus | null) =>
      validationStatus === null ? (
        <Text type="secondary">N/A</Text>
      ) : (
        <LaneValidationStatus validationStatus={validationStatus} isValidationInProgress={false} />
      ),
  },
  // {
  // 	title: 'Container Barcodes',
  // 	dataIndex: 'barcodes',
  // 	key: 'barcodes',
  // 	width: 280,
  // 	onHeaderCell: compactHeaderCell,
  // 	render: (barcodes: string[]) =>
  // 		barcodes?.length ? (
  // 			<Space size={[0, 4]} wrap>
  // 				{barcodes.map((barcode) => (
  // 					<Tag key={barcode}>{barcode}</Tag>
  // 				))}
  // 			</Space>
  // 		) : (
  // 			<Text type="secondary">N/A</Text>
  // 		),
  // },
  {
    title: "Reads",
    dataIndex: "number_of_reads",
    key: "number_of_reads",
    align: "right",
    width: 180,
    onHeaderCell: compactHeaderCell,
    render: (reads: number | null) =>
      reads !== null ? reads.toLocaleString("fr-CA") : <Text type="secondary">N/A</Text>,
  },
  {
    title: "Avg Quality",
    dataIndex: "average_quality",
    key: "average_quality",
    align: "right",
    width: 100,
    onHeaderCell: compactHeaderCell,
    render: (value: string | null) =>
      value !== null ? Number(value).toFixed(2) : <Text type="secondary">N/A</Text>,
  },
  {
    title: "% PF Aligned",
    dataIndex: "pf_reads_aligned",
    key: "pf_reads_aligned",
    align: "right",
    width: 100,
    onHeaderCell: compactHeaderCell,
    render: (value: string | null) =>
      value !== null ? `${(Number(value) * 100).toFixed(2)}` : <Text type="secondary">N/A</Text>,
  },
  {
    title: "% Duplicate",
    dataIndex: "duplicate_aligned",
    key: "duplicate_aligned",
    align: "right",
    width: 100,
    onHeaderCell: compactHeaderCell,
    render: (value: string | null) =>
      value !== null ? `${(Number(value) * 100).toFixed(2)}` : <Text type="secondary">N/A</Text>,
  },
  {
    title: "Readset Files",
    dataIndex: "readset_files",
    key: "readset_files",
    onHeaderCell: compactHeaderCell,
    render: (files?: ProjectOverviewReadset["readset_files"] | null) =>
      files?.length ? (
        <div style={{ whiteSpace: "nowrap" }}>
          {files.map((file, index) =>
            file.file_path ? (
              <div
                key={`${file.file_path}-${index}`}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <CopyableReadsetFilePath file={file.file_path} />
                <Text type="secondary">
                  {file.size !== null && file.size !== undefined
                    ? `${(Number(file.size) / 1024 / 1024).toFixed(2)} MB`
                    : "N/A"}
                </Text>
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <Text type="secondary">N/A</Text>
      ),
  },
]


function ProjectReadSetsTab({ parentProjectId, externalID }: ProjectReadSetsTabProps) {
  if (!parentProjectId) return undefined
  return (
    <>
      <ExternalIDReadSetDashboard parentProjectId={parentProjectId} />
      <Table
        dataSource={[]}
        columns={[]}
        rowKey="id"
        size="small"
        bordered
        scroll={{ x: "max-content", y: 400 }}
        pagination={{
          pageSize: 5,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} readsets`,
        }}
      />
    </>
  )
}

export default ProjectReadSetsTab
