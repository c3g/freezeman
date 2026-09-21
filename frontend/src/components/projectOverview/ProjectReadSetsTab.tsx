import ExternalIDReadSetDashboard from "./ExternalIDReadSetDashboard"

import { Table } from "antd"

interface ProjectReadSetsTabProps {
  parentProjectId: number | null
  externalID: string
}

function ProjectReadSetsTab({ parentProjectId }: ProjectReadSetsTabProps) {
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

enum ProjectReadsetsColumnID {
  ID = "ID",
  NAME = "NAME",
  SAMPLE_NAME = "SAMPLE_NAME",
}

function ProjectReadsetsTable() {

}