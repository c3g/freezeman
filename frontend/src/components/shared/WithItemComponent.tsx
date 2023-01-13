import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { FetchedObject, ItemsByID, Sample } from '../../models/frontend_models'
import { selectSamplesByID } from '../../selectors'
import { createWithItem, withSample } from '../../utils/withItem'
import { Typography } from 'antd'

const { Title } = Typography

type WithItemFunc = ReturnType<typeof createWithItem>
type ItemMappingFunc<T extends FetchedObject> = (item: T) => any

interface WithItemComponentProps<T extends FetchedObject> {
	withItem: WithItemFunc
	objectsByID: ItemsByID<T>
	objectID: string
	fn: ItemMappingFunc<T>
	defaultValue?: any
}

/**
 * 
 * @param withItem
 * @returns 
 */
const WithItemComponent = <T extends FetchedObject>({ withItem, objectsByID, objectID, fn, defaultValue }: WithItemComponentProps<T>) => {
	const [value, setValue] = useState<any>()

	useEffect(() => {
		const result = withItem(objectsByID, objectID, fn, defaultValue)
		if (result) {
			setValue(fn(result))
		}
	}, [objectsByID, objectID])

	return value ? <>{value}</> : defaultValue ? <>{defaultValue}</> : null
}

const createWithItemComponent = <T extends FetchedObject>(withItem: WithItemFunc) => {
	return (objectsByID: ItemsByID<T>, objectID: string, fn: ItemMappingFunc<T> = (item: T) => item, defaultValue: any = undefined) => {
		return <WithItemComponent withItem={withItem} objectsByID={objectsByID} objectID={objectID} fn={fn} defaultValue={defaultValue} />
	}
}

export const withSampleComponent = createWithItemComponent<Sample>(withSample)

const TryWithSample = ({}) => {
	const samplesByID = useSelector(selectSamplesByID)
	const sampleID = 'someid'

	return withSampleComponent(samplesByID, sampleID, (sample) => sample.name, 'Loading...')
}
