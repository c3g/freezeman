import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectSamplesByID, selectSamplesTable } from "../../selectors";
import SamplesTableActions from '../../modules/samplesTable/actions'
import { DataID, FilterSetting, createFixedFilter } from "../../models/paged_items";
import { FILTER_TYPE } from "../../constants";
import { ObjectWithSample, SAMPLE_COLUMN_DEFINITIONS, SAMPLE_COLUMN_FILTERS, SAMPLE_NEXT_STEP_FILTER_KEYS } from "../shared/WorkflowSamplesTable/SampleTableColumns";
import PagedItemsTable, { useFilteredColumns } from "../pagedItemsTable/PagedItemsTable"

const sampleColumns = [
  SAMPLE_COLUMN_DEFINITIONS.KIND,
  SAMPLE_COLUMN_DEFINITIONS.NAME,
  SAMPLE_COLUMN_DEFINITIONS.COHORT,
  SAMPLE_COLUMN_DEFINITIONS.VOLUME,
  SAMPLE_COLUMN_DEFINITIONS.CREATION_DATE,
  SAMPLE_COLUMN_DEFINITIONS.DEPLETED,
]

const ProjectsAssociatedSamples = ({
  projectID
}) => {
  const dispatch = useAppDispatch()
  const { setFilter, setFilterOptions } = SamplesTableActions
  const projectIDFilter = useMemo(() => {
    const filterKey = 'derived_samples__project__id'
    const filter: FilterSetting = createFixedFilter(FILTER_TYPE.INPUT_OBJECT_ID, filterKey, projectID)
    return filter
  }, [projectID])

  const samplesTable = useAppSelector(selectSamplesTable)
  const samplesByID = useAppSelector(selectSamplesByID)

  const columns = useFilteredColumns<ObjectWithSample>(
    sampleColumns, 
    SAMPLE_COLUMN_FILTERS, 
    SAMPLE_NEXT_STEP_FILTER_KEYS, 
    samplesTable.filters,
    setFilter,
    setFilterOptions)
  
  const mapSamplesByID = async (ids: DataID[]) => {
    return ids.reduce((acc, id) => {
      const sample = samplesByID[id]
      if (sample) {
        acc.push({id, sample})
      }
      return acc
    }, [] as ObjectWithSample[])
  }

  const requestPageCallback = useCallback((pageNumber: number) => {
		// Create a thunk and dispatch it.
		const requestAction = (page: number) => async (dispatch) => {
			dispatch(SamplesTableActions.listPage(page))
		}
		dispatch(requestAction(pageNumber))
  }, [dispatch])
  
  return (
    // Don't render until the sample fixed filter is set, or you will get all of the projects.
     <PagedItemsTable
      requestPageCallback={requestPageCallback}
      columns={columns}
      fixedFilter={projectIDFilter}
      getDataObjectsByID={mapSamplesByID}
      pagedItems={samplesTable}
      pagedItemsActions={SamplesTableActions}
      usingFilters={true}
    />
  )
}

export default ProjectsAssociatedSamples;
