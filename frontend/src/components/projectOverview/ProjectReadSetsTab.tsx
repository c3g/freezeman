import { useCallback, useEffect, useMemo, useState } from "react"
import { FILTER_TYPE } from "../../constants"
import { useAppDispatch } from "../../hooks"
import { FMSId, FMSProjectReadset } from "../../models/fms_api_models"
import {
  ColumnDefinitions,
  createQueryParamsFromFilters,
  createQueryParamsFromSortBy,
  FetchRowData,
  FilterDescriptions,
  FilterKeys,
  Filters,
  newFilterDefinitionsToFilterSet,
  SearchPropertiesDefinitions,
  SortKeys,
  useFilters,
  usePaginatedDataProps,
  useTableColumnsProps,
  useTableSortByProps,
} from "../../utils/tableHooks"
import ExternalIDReadSetDashboard from "./ExternalIDReadSetDashboard"

import { Button, ConfigProvider, Popover, Table } from "antd"
import api from "../../utils/api"
import FiltersBar from "../filters/filtersBar/FiltersBar"
import { CheckCircleTwoTone, CopyOutlined } from "@ant-design/icons"

interface ProjectReadSetsTabProps {
  parentProjectId: number | null
  externalID: string
}

function ProjectReadSetsTab({ parentProjectId }: ProjectReadSetsTabProps) {
  if (!parentProjectId) return undefined
  return (
    <>
      <ExternalIDReadSetDashboard parentProjectId={parentProjectId} />
      <ProjectReadsetsTable parentProjectID={parentProjectId} />
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
  READSET_FILES = "READSET_FILES",
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

const VALIDATION_STATUS_NUMBER_TO_LABEL = {
  "0": "Available",
  "1": "Passed",
  "2": "Failed",
} as const

const FILTER_DESCRIPTIONS: FilterDescriptions<ProjectReadsetsColumnID> = {
  [ProjectReadsetsColumnID.ID]: { type: FILTER_TYPE.INPUT_OBJECT_ID },
  [ProjectReadsetsColumnID.NAME]: { type: FILTER_TYPE.INPUT, startsWith: false, exactMatch: true },
  [ProjectReadsetsColumnID.SAMPLE_NAME]: {
    type: FILTER_TYPE.INPUT,
    startsWith: false,
    exactMatch: false,
  },
  [ProjectReadsetsColumnID.ALIAS]: {
    type: FILTER_TYPE.INPUT,
    startsWith: false,
    exactMatch: false,
  },
  [ProjectReadsetsColumnID.COHORT]: {
    type: FILTER_TYPE.INPUT,
    startsWith: false,
    exactMatch: false,
  },
  [ProjectReadsetsColumnID.LIBRARY_TYPE]: {
    type: FILTER_TYPE.INPUT,
    startsWith: false,
    exactMatch: false,
  },
  [ProjectReadsetsColumnID.RUN_NAME]: {
    type: FILTER_TYPE.INPUT,
    startsWith: true,
    exactMatch: true,
  },
  [ProjectReadsetsColumnID.RUN_START]: { type: FILTER_TYPE.DATE_RANGE },
  [ProjectReadsetsColumnID.VALIDATION_STATUS]: {
    type: FILTER_TYPE.SELECT,
    options: Object.entries(VALIDATION_STATUS_NUMBER_TO_LABEL).map(([k, v]) => ({
      value: k,
      label: v,
    })),
  },
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
    sorter: true,
    width: 100,
  },
  [ProjectReadsetsColumnID.NAME]: {
    title: "Readset Name",
    dataIndex: "name",
    sorter: true,
    width: 200,
  },
  [ProjectReadsetsColumnID.SAMPLE_NAME]: {
    title: "Sample Name",
    dataIndex: "sample_name",
    sorter: true,
    width: 200,
  },
  [ProjectReadsetsColumnID.ALIAS]: {
    title: "Alias",
    dataIndex: "alias",
    sorter: true,
    width: 200,
  },
  [ProjectReadsetsColumnID.COHORT]: {
    title: "Cohort",
    dataIndex: "cohort",
    width: 200,
  },
  [ProjectReadsetsColumnID.LIBRARY_TYPE]: {
    title: "Library Type",
    dataIndex: "library_type",
    width: 150,
  },
  [ProjectReadsetsColumnID.RUN_NAME]: {
    title: "Run Name",
    dataIndex: "run_name",
    sorter: true,
    width: 200,
  },
  [ProjectReadsetsColumnID.RUN_START]: {
    title: "Run Start",
    dataIndex: "run_start",
    sorter: true,
    width: 175,
  },
  [ProjectReadsetsColumnID.VALIDATION_STATUS]: {
    title: "Validation Status",
    dataIndex: "validation_status",
    render: (validation_status: FMSProjectReadset["validation_status"]) => {
      return VALIDATION_STATUS_NUMBER_TO_LABEL[validation_status]
    },
    width: 175,
  },
  [ProjectReadsetsColumnID.NUMBER_OF_READS]: {
    title: "nb_reads",
    dataIndex: "nb_reads",
    width: 125,
  },
  [ProjectReadsetsColumnID.AVERAGE_QUALITY]: {
    title: "avg_qual",
    dataIndex: "avg_qual",
    width: 100,
    render: (avg_qual: FMSProjectReadset['avg_qual']) => {
      return avg_qual.toFixed(3)
    }
  },
  [ProjectReadsetsColumnID.PF_READS_ALIGNED]: {
    title: "pf_reads_aligned",
    dataIndex: "pf_reads_aligned",
    width: 150,
  },
  [ProjectReadsetsColumnID.DUPLICATE_ALIGNED]: {
    title: "duplicate_aligned",
    dataIndex: "duplicate_aligned",
    width: 150,
  },
  [ProjectReadsetsColumnID.READSET_FILES]: {
    title: "Files (hover to see full path)",
    dataIndex: "readset_files",
    render: (readset_files: FMSProjectReadset["readset_files"]) => {
      return (
        <>
          {readset_files.map((s) => (
            <CopyableReadsetFilePath key={s.file_path} file={s.file_path} />
          ))}
        </>
      )
    },
    width: 250,
  },
}

function ProjectReadsetsTable({ parentProjectID }: { parentProjectID: FMSId }) {
  const dispatch = useAppDispatch()
  const fetchProjectReadsets = useCallback<
    FetchRowData<ProjectReadsetsColumnID, FMSProjectReadset>
  >(
    async ({ pageNumber, pageSize, filters, sortBy }) => {
      const response = await dispatch(
        api.projectReadsets.list(
          {
            ...createQueryParamsFromFilters(FILTER_KEYS, FILTER_DESCRIPTIONS, filters),
            ...createQueryParamsFromSortBy(SORT_KEYS, sortBy),
            dataset__project__parent_project__id__in: parentProjectID,
            offset: (pageNumber - 1) * pageSize,
            limit: pageSize,
          },
          {
            abort: true,
            requestID: "ProjectReadsetsTable.fetchReadsets",
          },
        ),
      )
      return {
        total: response.data.count,
        data: response.data.results,
      }
    },
    [dispatch, parentProjectID],
  )

  const defaultPageSize = 5

  const [tableDataProps, paginationProps, { fetchRowData }] = usePaginatedDataProps({
    defaultPageSize,
    fetchRowData: fetchProjectReadsets,
  })

  const DEBOUNCE_DELAY = 500
  const debouncedOnSort = useCallback(
    (newSortBy: Partial<Record<ProjectReadsetsColumnID, "ascend" | "descend">>) => {
      fetchRowData({ sortBy: newSortBy, pageNumber: 1 }, DEBOUNCE_DELAY)
    },
    [fetchRowData],
  )
  const [tableSortByProps, { sortBy }] = useTableSortByProps<
    ProjectReadsetsColumnID,
    FMSProjectReadset
  >(debouncedOnSort)

  const debouncedOnFilter = useCallback(
    (newFilters: Filters<ProjectReadsetsColumnID>) => {
      fetchRowData({ filters: newFilters, pageNumber: 1 }, DEBOUNCE_DELAY)
    },
    [fetchRowData],
  )
  const [filters, setFilters] = useFilters<ProjectReadsetsColumnID>({}, debouncedOnFilter)

  const tableColumnsProps = useTableColumnsProps<ProjectReadsetsColumnID, FMSProjectReadset>({
    filters,
    setFilters,
    filterDescriptions: FILTER_DESCRIPTIONS,
    columnDefinitions: COLUMN_DEFINITIONS,
    searchPropertyDefinitions: SEARCH_DEFINITIONS,
    sortBy,
  })

  const filterSet = useMemo(
    () =>
      Object.entries(filters).reduce(
        (acc, [columnID, filterValue]) => {
          const filterDescription = FILTER_DESCRIPTIONS[columnID as ProjectReadsetsColumnID]
          if (!filterDescription) {
            return acc
          }
          return {
            ...acc,
            ...newFilterDefinitionsToFilterSet(
              columnID as ProjectReadsetsColumnID,
              filterValue,
              filterDescription,
              SEARCH_DEFINITIONS[columnID as ProjectReadsetsColumnID],
            ),
          }
        },
        {} as ReturnType<typeof newFilterDefinitionsToFilterSet>,
      ),
    [filters],
  )

  useEffect(() => {
    fetchRowData({ pageNumber: 1, pageSize: defaultPageSize })
  }, [fetchRowData])

  return (
    <>
      <FiltersBar
        filters={filterSet}
        clearFilters={() => {
          setFilters({})
        }}
      />
      <ConfigProvider
        theme={{
          components: {
            Table: {
              cellPaddingBlock: 4,
              cellPaddingInline: 8
            }
          }
        }}
      >
        <Table<FMSProjectReadset>
          {...tableDataProps}
          {...tableSortByProps}
          {...tableColumnsProps}
          rowKey={"id"}
          bordered
          pagination={paginationProps}
          scroll={{ x: "100%", y: "40vh" }}
          tableLayout={"fixed"}
        />
      </ConfigProvider>
    </>
  )
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
      <Popover content={file} mouseEnterDelay={0} mouseLeaveDelay={0} destroyOnHidden={true}>
        <span style={{ overflowX: "hidden", textWrap: "nowrap", textOverflow: "ellipsis", direction: "rtl", width: "17em" }}>
          {file}
        </span>
      </Popover>
      <Button
        type="text"
        size="small"
        onClick={handleCopy}
        icon={copiedToClipboard ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : <CopyOutlined />}
      />
    </div>
  )
}
