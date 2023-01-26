import { Tag } from 'antd'
import React from 'react'
import { useAppSelector } from '../hooks'
import { selectSampleKindsByID } from '../selectors'


const SampleKindTag = ({sampleKindID} : {sampleKindID: number}) => {
	const sampleKindsByID = useAppSelector(selectSampleKindsByID)
	return (
		<Tag>{sampleKindID ? sampleKindsByID[sampleKindID]?.name : "POOL"}</Tag>
	)
}

export default SampleKindTag
