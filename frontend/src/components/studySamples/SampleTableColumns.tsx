import React from 'react'
import { TableColumnType, TableColumnsType, Tag } from 'antd'
import { Sample } from '../../models/frontend_models'
import { Link } from 'react-router-dom'
import { useAppSelector } from '../../hooks'
import { selectSampleKindsByID } from '../../selectors'


const ID : TableColumnType<Sample> = {
	title: 'ID',
	dataIndex: 'id',
	render: (_, sample) =>
        <Link to={`/samples/${sample.id}`}>
          <div>{sample.id}</div>
        </Link>,
}

// const SampleKindTag = ({sampleKindID} : {sampleKindID: number}) => {
// 	const sampleKindsByID = useAppSelector(selectSampleKindsByID)
// 	return (
// 		<Tag>{sampleKindID ? sampleKindsByID[sampleKindID]?.name : "POOL"}</Tag>
// 	)
// }

const useSampleKind = (sampleKindID: number): string => {
	const sampleKindsByID = useAppSelector(selectSampleKindsByID) 
	return sampleKindID ? sampleKindsByID[sampleKindID]?.name : "POOL"
} 

const KIND : TableColumnType<Sample> = {
	title: "Kind",
	dataIndex: "sample_kind",
	render: (_, sample) =>
		<Tag>{useSampleKind(sample.sample_kind)}</Tag>
}

const NAME: TableColumnType<Sample> = {
	title: 'Name',
	dataIndex: 'name',
	render: (name, sample) => 
		<Link to={`/samples/${sample.id}`}>
          <div>{name}</div>
          {sample.alias &&
            <div><small>alias: {sample.alias}</small></div>
          }
        </Link>
}

// const INDIVIDUAL: TableColumnType<Sample> = {
// 	title: "Individual",
// 	dataIndex: "individual",
// 	render: (_, sample) => {
// 	  const individual = sample.individual
// 	  return (individual &&
// 		<Link to={`/individuals/${individual}`}>
// 		  {withIndividual(individualsByID, individual, individual => individual.name, "loading...")}
// 		</Link>)
// 	}
// }




const SAMPLE_COLUMNS = {
	ID
}

export default SAMPLE_COLUMNS

