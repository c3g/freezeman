import { ConfigProvider, Table } from 'antd'
import React, { useCallback, useContext, useEffect, useMemo } from 'react'
import { ObjectWithProject, PROJECT_COLUMN_DEFINITIONS, PROJECT_FILTER_KEYS, ProjectColumnID } from './ProjectsTableColumns'
import { useAppDispatch } from '../../hooks'
import { createQueryParamsFromFilters, createQueryParamsFromSortBy, FetchRowData, FilterDescriptions, Filters, SearchPropertiesDefinitions, useFilters, usePaginatedDataProps, useTableColumnsProps, useTableSortByProps } from '../../utils/tableHooks'
import api from '../../utils/api'
import { FMSProject } from '../../models/fms_api_models'
import ListExportContext from './ListExportContext'
import produce from 'immer'

export interface ProjectTableProps {
    defaultPageSize: number
    columnIDs: readonly ProjectColumnID[]
	filterDescriptions?: FilterDescriptions<ProjectColumnID>
	setFilterDescriptions?: React.Dispatch<React.SetStateAction<FilterDescriptions<ProjectColumnID>>>
	sorter?: boolean
    fixedQueryParams?: Record<string, any>
    requestIDSuffix?: string
	tableProps?: Pick<React.ComponentProps<typeof Table>, 'style' | 'styles' | 'pagination'>
}
function ProjectTable({
	defaultPageSize,
	columnIDs,
	filterDescriptions, setFilterDescriptions,
	sorter = true,
	fixedQueryParams,
	requestIDSuffix,
	tableProps,
}: ProjectTableProps) {
	const dispatch = useAppDispatch()

	const [
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_,
		setListExportContext
	] = useContext(ListExportContext)
	const fetchProjects = useCallback<FetchRowData<ProjectColumnID, ObjectWithProject>>(async ({
		pageNumber, pageSize, filters, sortBy
	}) => {
		const options = {
			...createQueryParamsFromFilters(PROJECT_FILTER_KEYS, filterDescriptions ?? {}, filters),
			...createQueryParamsFromSortBy(PROJECT_FILTER_KEYS, sortBy),
			offset: (pageNumber - 1) * pageSize,
			limit: pageSize,
			...fixedQueryParams
		}
		const response = await dispatch(api.projects.list(
			options,
			true,
			"ProjectTable.fetchProjects" + (requestIDSuffix ?? "")
		))
		setListExportContext?.({
			itemsCount: response.data.count,
			options
		})
		return {
			total: response.data.count,
			data: response.data.results.map(wrapProject)
		}
	}, [dispatch, filterDescriptions, fixedQueryParams, requestIDSuffix, setListExportContext])

    const tableHeight = tableProps?.style?.height ?? '75vh'
	const [paginatedDataProps, { fetchRowData }] = usePaginatedDataProps({
		defaultPageSize,
		fetchRowData: fetchProjects,
		bodySpinStyle: useMemo(() => ({ height: tableHeight, alignContent: 'center' }), [tableHeight])
	})

	const DEBOUNCE_DELAY = 500
    const debouncedOnSort = useCallback((newSortBy: Partial<Record<ProjectColumnID, 'ascend' | 'descend'>>) => {
        fetchRowData({ sortBy: newSortBy, pageNumber: 1 }, DEBOUNCE_DELAY)
    }, [fetchRowData])
	const [tableSortByProps, { sortBy }] = useTableSortByProps<ProjectColumnID, ObjectWithProject>(debouncedOnSort)

	const debouncedOnFilter = useCallback((newFilters: Filters<ProjectColumnID>) => {
		fetchRowData({ filters: newFilters, pageNumber: 1 }, DEBOUNCE_DELAY)
	}, [fetchRowData])
	const [filters, setFilters] = useFilters<ProjectColumnID>({}, debouncedOnFilter)

	const columnDefinitions = useMemo<Partial<typeof PROJECT_COLUMN_DEFINITIONS>>(() => {
		return produce(PROJECT_COLUMN_DEFINITIONS, (draft) => {
			for (const key of Object.keys(draft) as ProjectColumnID[]) {
				if (!columnIDs.includes(key)) {
					delete draft[key]
				} else {
					draft[key].sorter = sorter ? draft[key].sorter : false
				}
			}
		})
	}, [columnIDs, sorter])

	const emptySortBy = useMemo(() => ({}), [])
	const tableColumnsProps = useTableColumnsProps<ProjectColumnID, ObjectWithProject>({
		filters,
		setFilters,
		setFilterDescriptions,
		filterDescriptions: filterDescriptions ?? {},
		columnDefinitions,
		searchPropertyDefinitions: SEARCH_DEFINITIONS,
		sortBy: sorter ? sortBy : emptySortBy,
	})

	useEffect(() => {
		fetchRowData({ pageNumber: 1 })
	}, [fetchRowData])

	return (
		<ConfigProvider
			theme={{
				components: {
					Table: {
						cellPaddingBlock: 0
					},
				},
			}}
        >
			<Table<ObjectWithProject>
				{...paginatedDataProps}
				{...tableSortByProps}
				{...tableColumnsProps}
				rowKey={rowKey}
				scroll={{ y: tableHeight }}
				bordered
				{...tableProps}
			/>
		</ConfigProvider>
	)
}

export default ProjectTable

function wrapProject(project: FMSProject) {
	return {project}
}
function rowKey({project: {id}}: ObjectWithProject) {
    return id
}

const SEARCH_DEFINITIONS: SearchPropertiesDefinitions<ProjectColumnID> = {
    [ProjectColumnID.ID]: { placeholder: 'Project ID' },
    [ProjectColumnID.NAME]: { placeholder: 'Project Name' },
    [ProjectColumnID.EXTERNAL_ID]: { placeholder: 'External ID' },
    [ProjectColumnID.PRINCIPAL_INVESTIGATOR]: { placeholder: 'Principal Investigator' },
    [ProjectColumnID.REQUESTOR_NAME]: { placeholder: 'Requestor Name' },
    [ProjectColumnID.REQUESTOR_EMAIL]: { placeholder: 'Requestor Email' },
    [ProjectColumnID.TARGETED_END_DATE]: { placeholder: 'Targeted End Date' },
    [ProjectColumnID.STATUS]: { placeholder: 'Status' },
}
