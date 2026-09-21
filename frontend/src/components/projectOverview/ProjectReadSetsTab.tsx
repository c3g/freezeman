import { FILTER_TYPE } from "../../constants"
import { FMSProjectReadset } from "../../models/fms_api_models"
import { ColumnDefinitions, FilterDescriptions, FilterKeys, SearchPropertiesDefinitions, SortKeys } from "../../utils/tableHooks"
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
  ALIAS = "ALIAS",
  COHORT = "COHORT",
  LIBRARY_TYPE = "LIBRARY_TYPE",
  RUN_NAME = "RUN_NAME",
  RUN_START = "RUN_START",
  VALIDATION_STATUS = "VALIDATION_STATUS",
  NUMBER_OF_READS = "NUMBER_OF_READS",
  AVERAGE_QUALITY = "AVERAGE_QUALITY",
  PF_READS_ALIGNED = "PF_READS_ALIGNED",
  DUPLICATE_ALIGNED = "DUPLICATE_ALIGNED",
  READSET_FILES = "READSET_FILES"
}

const FILTER_KEYS: FilterKeys<ProjectReadsetsColumnID> = {
  [ProjectReadsetsColumnID.ID]: "id",
  [ProjectReadsetsColumnID.NAME]: "name",
  [ProjectReadsetsColumnID.SAMPLE_NAME]: "sample_name",
  [ProjectReadsetsColumnID.ALIAS]: "derived_sample__biosample__alias",
  [ProjectReadsetsColumnID.COHORT]: "derived_sample__biosample__individual__cohort",
  [ProjectReadsetsColumnID.LIBRARY_TYPE]: "derived_sample__library__library_type__name",
  [ProjectReadsetsColumnID.RUN_NAME]: "dataset__experiment_run__name",
  [ProjectReadsetsColumnID.RUN_START]: "dataset__experiment_run__start_date",
  [ProjectReadsetsColumnID.VALIDATION_STATUS]: "validation_status",
  // [ProjectReadsetsColumnID.NUMBER_OF_READS]: "number_reads",
  // [ProjectReadsetsColumnID.AVERAGE_QUALITY]: "",
  // [ProjectReadsetsColumnID.PF_READS_ALIGNED]: "",
  // [ProjectReadsetsColumnID.DUPLICATE_ALIGNED]: "",
  // [ProjectReadsetsColumnID.READSET_FILES]: "",
}
const SORT_KEYS: SortKeys<ProjectReadsetsColumnID> = FILTER_KEYS

const FILTER_DESCRIPTIONS: FilterDescriptions<ProjectReadsetsColumnID> = {
  [ProjectReadsetsColumnID.ID]: { type: FILTER_TYPE.INPUT, startsWith: false, exactMatch: true },
  [ProjectReadsetsColumnID.NAME]: { type: FILTER_TYPE.INPUT, startsWith: false, exactMatch: true },
  [ProjectReadsetsColumnID.SAMPLE_NAME]: { type: FILTER_TYPE.INPUT, startsWith: false, exactMatch: false },
  [ProjectReadsetsColumnID.ALIAS]: { type: FILTER_TYPE.INPUT, startsWith: false, exactMatch: false },
  [ProjectReadsetsColumnID.COHORT]: { type: FILTER_TYPE.INPUT, startsWith: false, exactMatch: false },
  [ProjectReadsetsColumnID.LIBRARY_TYPE]: { type: FILTER_TYPE.INPUT, startsWith: false, exactMatch: false },
  [ProjectReadsetsColumnID.RUN_NAME]: { type: FILTER_TYPE.INPUT, startsWith: true, exactMatch: true },
  [ProjectReadsetsColumnID.RUN_START]: { type: FILTER_TYPE.DATE_RANGE },
  [ProjectReadsetsColumnID.VALIDATION_STATUS]: { type: FILTER_TYPE.SELECT, options: [ { value: "0", label: "Available" }, { value: "1", label: "Passed" }, { value: "2", label: "Failed" } ] },
}

const SEARCH_DEFINITIONS: SearchPropertiesDefinitions<ProjectReadsetsColumnID> = {
  [ProjectReadsetsColumnID.ID]: {},
  [ProjectReadsetsColumnID.NAME]: {},
  [ProjectReadsetsColumnID.SAMPLE_NAME]: {},
  [ProjectReadsetsColumnID.ALIAS]: {},
  [ProjectReadsetsColumnID.COHORT]: {},
  [ProjectReadsetsColumnID.LIBRARY_TYPE]: {},
  [ProjectReadsetsColumnID.RUN_NAME]: {},
  [ProjectReadsetsColumnID.RUN_START]: {},
  [ProjectReadsetsColumnID.VALIDATION_STATUS]: {},
}

const COLUMN_DEFINITIONS: ColumnDefinitions<ProjectReadsetsColumnID, FMSProjectReadset> = {
  [ProjectReadsetsColumnID.ID]: {
    title: "ID",
    dataIndex: "id",
    key: "id",
    sorter: true,
  },
  [ProjectReadsetsColumnID.NAME]: {
    title: "Readset Name",
    dataIndex: "name",
    key: "name",
    sorter: true,
  },
  [ProjectReadsetsColumnID.SAMPLE_NAME]: {
    title: "Sample Name",
    dataIndex: "sample_name",
    key: "sample_name",
    sorter: true,
  },
  [ProjectReadsetsColumnID.ALIAS]: {
    title: "Alias",
    dataIndex: "alias",
    key: "alias",
    sorter: true,
  },
  [ProjectReadsetsColumnID.COHORT]: {
    title: "Cohort",
    dataIndex: "cohort",
    key: "cohort",
    sorter: true,
  },
  [ProjectReadsetsColumnID.LIBRARY_TYPE]: {
    title: "Library Type",
    dataIndex: "library_type",
    key: "library_type",
    sorter: true,
  },
  [ProjectReadsetsColumnID.RUN_NAME]: {
    title: "Run Name",
    dataIndex: "run_name",
    key: "run_name",
    sorter: true,
  },
  [ProjectReadsetsColumnID.RUN_START]: {
    title: "Run Start",
    dataIndex: "run_start",
    key: "run_start",
    sorter: true,
  },
  [ProjectReadsetsColumnID.VALIDATION_STATUS]: {
    title: "Validation Status",
    dataIndex: "validation_status",
    key: "validation_status",
    sorter: true,
  },
  [ProjectReadsetsColumnID.NUMBER_OF_READS]: {
    title: "Number of Reads",
    dataIndex: "nb_reads",
    key: "nb_reads",
  },
  [ProjectReadsetsColumnID.AVERAGE_QUALITY]: {
    title: "Avg Quality",
    dataIndex: "avg_qual",
    key: "avg_qual",
  },
  [ProjectReadsetsColumnID.PF_READS_ALIGNED]: {
    title: "PF Reads Aligned",
    dataIndex: "pf_reads_aligned",
    key: "pf_reads_aligned",
  },
  [ProjectReadsetsColumnID.DUPLICATE_ALIGNED]: {
    title: "Duplicate Aligned",
    dataIndex: "duplicate_aligned",
    key: "duplicate_aligned",
  },
  [ProjectReadsetsColumnID.READSET_FILES]: {
    title: "Files",
    dataIndex: "readset_files",
    key: "readset_files",
    render: (_, record) => {
      return record.readset_files.map((s) => s.file_path).join(";")
    }
  }
}


function ProjectReadsetsTable() {

}
