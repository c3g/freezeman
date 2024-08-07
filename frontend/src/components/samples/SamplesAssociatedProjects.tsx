import React, { useEffect, useState } from "react"
import { FILTER_TYPE } from "../../constants"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { FilterSetting, createFixedFilter } from "../../models/paged_items"
import ProjectsOfSamplesActions from '../../modules/projectsOfSamples/actions'
import { selectProjectsByID, selectProjectsOfSamples } from "../../selectors"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import { ObjectWithProject, PROJECT_COLUMN_DEFINITIONS, PROJECT_FILTERS, PROJECT_FILTER_KEYS } from '../projects/ProjectsTableColumns'

const projectColumns = [
  PROJECT_COLUMN_DEFINITIONS.NAME,
  PROJECT_COLUMN_DEFINITIONS.PRINCIPAL_INVESTIGATOR,
  PROJECT_COLUMN_DEFINITIONS.REQUESTOR_NAME,
  PROJECT_COLUMN_DEFINITIONS.REQUESTOR_EMAIL,
  PROJECT_COLUMN_DEFINITIONS.TARGETED_END_DATE,
  PROJECT_COLUMN_DEFINITIONS.STATUS
]

const SamplesAssociatedProjects = ({
  sampleID,
}) => {
  const dispatch = useAppDispatch()
  const projectsOfSamples = useAppSelector(selectProjectsOfSamples)
  const [sampleIDFilter, setSampleIDFilter] = useState<FilterSetting>()

  const tableCallbacks = usePagedItemsActionsCallbacks(ProjectsOfSamplesActions)

  const columns = useFilteredColumns<ObjectWithProject>(
                    projectColumns, 
                    PROJECT_FILTERS, 
                    PROJECT_FILTER_KEYS, 
                    projectsOfSamples.filters,
                    tableCallbacks.setFilterCallback,
                    tableCallbacks.setFilterOptionsCallback)

  useEffect(() => {
    if (sampleID) {
      const filterKey = 'project_derived_by_samples__sample__id'
		  const filter: FilterSetting = createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, filterKey, sampleID.toString())
      dispatch(ProjectsOfSamplesActions.setFixedFilter({...filter}))
      setSampleIDFilter({...filter})
      dispatch(ProjectsOfSamplesActions.setStale(true))
    }
  }, [sampleID, dispatch])

  const mapProjectIDs = useItemsByIDToDataObjects(selectProjectsByID, project => {return { project }})

  return (
		// Don't render until the sample fixed filter is set, or you will get all of the projects.
		sampleIDFilter && (
			<PagedItemsTable
				columns={columns}
				fixedFilter={sampleIDFilter}
				getDataObjectsByID={mapProjectIDs}
				pagedItems={projectsOfSamples}
				usingFilters={true}
				{...tableCallbacks}
			/>
		)
  )
}

export default SamplesAssociatedProjects
