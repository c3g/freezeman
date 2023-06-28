import React, { useCallback, useEffect, useState } from "react"
import PagedItemsTable, { useFilteredColumns, usePagedItemsActionsCallbacks } from "../pagedItemsTable/PagedItemsTable"
import { ObjectWithProject, PROJECT_COLUMN_DEFINITIONS, PROJECT_FILTERS, PROJECT_FILTER_KEYS } from '../projects/ProjectsTableColumns'
import { useAppDispatch, useAppSelector } from "../../hooks"
import { DataID, FilterSetting, createFixedFilter } from "../../models/paged_items"
import ProjectsOfSamplesActions from '../../modules/projectsOfSamples/actions'
import { selectProjectsByID, selectProjectsOfSamples } from "../../selectors"
import { FILTER_TYPE } from "../../constants"

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
  const projectsOfSamples = useAppSelector(selectProjectsOfSamples)
  const projectsByID = useAppSelector(selectProjectsByID)
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
      const filterKey = 'project_derived_samples__samples__id'
		  const filter: FilterSetting = createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, filterKey, sampleID)
      setSampleIDFilter(filter)
    }
  }, [sampleID])

  const mapProjectsByID = async (ids: DataID[]) => {
    return ids.reduce((acc, id) => {
      const project = projectsByID[id]
      if (project) {
        acc.push({id, project})
      }
      return acc
    }, [] as ObjectWithProject[])
  }

  // TODO : This table is actually broken, because there is no mechanism to stored retrieved
  // projects in redux. It only seems to work because most of the projects from the db are
  // loaded into redux at startup.

  return (
      // Don't render until the sample fixed filter is set, or you will get all of the projects.
      sampleIDFilter && 
       <PagedItemsTable
        columns={columns}
        fixedFilter={sampleIDFilter}
        getDataObjectsByID={mapProjectsByID}
        pagedItems={projectsOfSamples}
        usingFilters={true}
        {...tableCallbacks}
      />
  )
}

export default SamplesAssociatedProjects
