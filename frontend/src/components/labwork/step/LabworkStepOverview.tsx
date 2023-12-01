import { Collapse, Typography} from 'antd'
import React, { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { refreshLabwork, setHideEmptySections } from '../../../modules/labwork/actions'
import { LabworkSummary } from '../../../modules/labwork/models'
import Flexbar from '../../shared/Flexbar'
import GroupingButton from '../../GroupingButton'
import LabworkStepOverviewPanel from './LabworkStepOverviewPanel'
import { selectLibrariesByID, selectSamplesByID } from '../../../selectors'

const { Title } = Typography

interface LabworkStepGroup {
	name: string,
	count: number,
  sample_ids: number[]
}

const GROUPING_KEY_PROJECT = "sample__derived_samples__project__name"
const GROUPING_KEY_CONTAINER = "ordering_container_name"
const GROUPING_KEY_CREATION_DATE = "sample__creation_date"
const GROUPING_KEY_CREATED_BY = "sample__created_by__username"


const LabworkStepOverview = (step) => {
	const dispatch = useAppDispatch()
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [activeGrouping, setActiveGrouping] = useState<string>(GROUPING_KEY_PROJECT)
	const samplesByID = useAppSelector(selectSamplesByID)
	const librariesByID = useAppSelector(selectLibrariesByID)

  const groups: LabworkStepGroup[] = []
  
  const handleChangeActiveGrouping = (grouping) => {
    setActiveGrouping(grouping)
    console.log(grouping)
  }

	return (
		<>
      <div>
        <GroupingButton grouping={GROUPING_KEY_PROJECT} label="Project" selected={activeGrouping===GROUPING_KEY_PROJECT} refreshing={refreshing} onClick={handleChangeActiveGrouping}/>
				<GroupingButton grouping={GROUPING_KEY_CONTAINER} label="Container" selected={activeGrouping===GROUPING_KEY_CONTAINER} refreshing={refreshing} onClick={handleChangeActiveGrouping}/>
        <GroupingButton grouping={GROUPING_KEY_CREATION_DATE} label="Creation Date" selected={activeGrouping===GROUPING_KEY_CREATION_DATE} refreshing={refreshing} onClick={handleChangeActiveGrouping}/>
        <GroupingButton grouping={GROUPING_KEY_CREATED_BY} label="Created By" selected={activeGrouping===GROUPING_KEY_CREATED_BY} refreshing={refreshing} onClick={handleChangeActiveGrouping}/>
      </div>
			<Collapse>
				{groups.map((group) => {
					return (
						<Collapse.Panel key={group.name} header={group.name} extra={<Title level={4}>{group.count}</Title>}>
							<LabworkStepOverviewPanel/>
						</Collapse.Panel>
					)
				})}
			</Collapse>
		</>
	)
}

export default LabworkStepOverview
