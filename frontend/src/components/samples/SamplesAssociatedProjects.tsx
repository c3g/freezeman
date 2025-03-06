import React, { useEffect, useState } from "react"
import { FILTER_TYPE } from "../../constants"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { FilterSetting } from "../../models/paged_items"
import ProjectsOfSamplesActions from '../../modules/projectsOfSamples/actions'
import { selectProjectsByID, selectProjectsOfSamples } from "../../selectors"
import PagedItemsTable from "../pagedItemsTable/PagedItemsTable"
import { useFilteredColumns } from "../pagedItemsTable/useFilteredColumns"
import { usePagedItemsActionsCallbacks } from "../pagedItemsTable/usePagedItemsActionCallbacks"
import { useItemsByIDToDataObjects } from "../pagedItemsTable/useItemsByIDToDataObjects"
import { ObjectWithProject, PROJECT_COLUMN_DEFINITIONS, PROJECT_FILTERS, PROJECT_FILTER_KEYS, ProjectColumnID } from '../projects/ProjectsTableColumns'

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
      dispatch(ProjectsOfSamplesActions.setFilter(
        filterKey,
        sampleID.toString(),
        {
          type: FILTER_TYPE.INPUT_OBJECT_ID,
          key: filterKey,
          label: 'Sample ID',
        }
      ))
      dispatch(ProjectsOfSamplesActions.setFilterFixed(filterKey, true))
      dispatch(ProjectsOfSamplesActions.setStale(true))
    }
  }, [sampleID, dispatch])

  const mapProjectIDs = useItemsByIDToDataObjects(selectProjectsByID, project => {return { project }})

  return (
      <PagedItemsTable
        columns={columns}
        getDataObjectsByID={mapProjectIDs}
        pagedItems={projectsOfSamples}
        usingFilters={true}
        initialLoad={false}
        {...tableCallbacks}
      />
  )
}

export default SamplesAssociatedProjects
