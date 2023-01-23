import { Table, TableColumnType } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '../../hooks'
import { ItemsByID, Sample } from '../../models/frontend_models'
import { StudySampleStep } from '../../models/study_samples'
import { selectSamplesByID } from '../../selectors'
import { withSample } from '../../utils/withItem'

interface StudyStepSamplesTableProps {
	step: StudySampleStep
}

type DataSourceType = {sampleID: number}


function createColumns(): ColumnsType<Sample> {
	return [
		{
			title: 'ID',
			dataIndex: 'id',
			render: (id, sample) => <Link to={`/samples/${sample.id}`}>{id}</Link>
		},
		{
			title: 'Alias',
			dataIndex: 'alias',
		},
		{
			title: 'Name',
			dataIndex: 'name',
			render: (name, sample) => <Link to={`/samples/${sample.id}`}>{name}</Link>
		},
		{
			title: 'Container Barcode',
			render: (_, sample) => {
				return (
					<></>
				)
			}
		}
	]

}

function StudyStepSamplesTable({step} : StudyStepSamplesTableProps) {

	const [samples, setSamples] = useState<Sample[]>()

	const samplesByID = useAppSelector(selectSamplesByID)

	useEffect(() => {
		const availableSamples = step.samples.reduce((acc, sampleID) => {
			const sample = samplesByID[sampleID]
			if (sample) {
				acc.push(sample)
			}
			return acc
		}, [] as Sample[])

		setSamples(availableSamples)
	}, [samplesByID])

	
	return (
		<Table
			dataSource={samples ?? []}
			columns={createColumns()}
			rowKey='id'
		/>
	)
}

export default StudyStepSamplesTable

