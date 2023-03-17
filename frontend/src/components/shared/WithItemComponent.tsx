import React, { useEffect, useState } from 'react'
import { FMSTrackedModel } from '../../models/fms_api_models'
import { Container, Individual, ItemsByID, Project, Sample } from '../../models/frontend_models'
import { createWithItem, withContainer, withIndividual, withProject, withSample } from '../../utils/withItem'

/**
 * WithItemComponent
 * 
 * This component wraps calls to 'withSample', 'withContainer' etc. into a component.
 * The problem with the 'withXXX' functions is that they are modifying state while React
 * is rendering components. WithItemComponent handles the state changes inside a useEffect()
 * function, which solves that problem.
 * 
 * You don't use WithItemComponent directly. There are function for specific object types
 * (withSampleComponent, withContainerComponent, etc.) which can be used in templates.
 * 
 * WithItemRenderComponent is easier to use and should be preferred. WithItemComponent
 * matches the existing 'withItem' calls and was created to make it easier to refactor
 * the existing code.
 * 
 * Example:
 * 
 * 	
 * const MyComponent = ({sampleID}) => {
 *		const samplesByID = useSelector(selectSamplesByID)
 *		return (
 *			<span>
 *				{withSampleComponent(samplesByID, sampleID, sample => sample.name, 'loading...')}
 *			</span>
 *		)
 *	}
 * 
 */



type WithItemFunc = ReturnType<typeof createWithItem>
type ItemMappingFunc<T extends FMSTrackedModel> = (item: T) => any

interface WithItemComponentProps<T extends FMSTrackedModel> {
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
const WithItemComponent = <T extends FMSTrackedModel>({ withItem, objectsByID, objectID, fn, defaultValue }: WithItemComponentProps<T>) => {
	const [value, setValue] = useState<any>()

	useEffect(() => {
		const result = withItem(objectsByID, objectID, fn, defaultValue)
		if (result) {
			setValue(fn(result))
		}
	}, [objectsByID, objectID])

	return value ? <>{value}</> : defaultValue ? <>{defaultValue}</> : null
}

const createWithItemComponent = <T extends FMSTrackedModel>(withItem: WithItemFunc) => {

	// The parent function is also considered a React component by the compiler/linter
	// and needs to be a named function.
	function WithItemComponentParent(
		objectsByID: ItemsByID<T>, 
		objectID: string, 
		fn: ItemMappingFunc<T> = (item: T) => item, 
		defaultValue: any = undefined) {
			return <WithItemComponent withItem={withItem} objectsByID={objectsByID} objectID={objectID} fn={fn} defaultValue={defaultValue} />
		}

	return WithItemComponentParent
}

export const withSampleComponent = createWithItemComponent<Sample>(withSample)
export const withContainerComponent = createWithItemComponent<Container>(withContainer)
export const withProjectComponent = createWithItemComponent<Project>(withProject)
export const withIndividualComponent = createWithItemComponent<Individual>(withIndividual)
// More components can be defined here...

