import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Container, FetchedObject, Individual, ItemsByID, Project, Sample, User } from '../../models/frontend_models'
import { selectContainersByID, selectIndividualsByID, selectProjectsByID, selectSamplesByID, selectUsersByID } from '../../selectors'
import { createWithItem, withContainer, withIndividual, withProject, withSample, withUser } from '../../utils/withItem'

/**
 * WithItemRenderComponent
 * 
 * 
 */

type WithItemFunc = ReturnType<typeof createWithItem>
type ItemRenderFunc<T extends FetchedObject> = (item: T) => React.ReactElement
type ItemsByIDSelectorFunc<T extends FetchedObject> = (state: any) => ItemsByID<T>

/**
 * This factory function returns a component function for rendering a specific type of object (Sample, Container, etc.).
 * The withItem and selector functions are curried into the component function.
 * 
 * @param withItem The `withXXX` function that matches the object type (eg withSample or withContainer)
 * @param selector The selector function for the `itemsByID` state that matches the object type (eg selectSamplesByID)
 * @returns A pure React component function.
 */
function WithItemRenderComponentFactory<W extends WithItemFunc, T extends FetchedObject> (withItem : W, selector: ItemsByIDSelectorFunc<T>) {

	interface WithItemRenderComponentProps<T extends FetchedObject> {
		objectID: string
		render: ItemRenderFunc<T>
		placeholder?: React.ReactElement
	}

    const WithItemRenderComponent = ({objectID, render, placeholder} : WithItemRenderComponentProps<T>) => {
		const objectsByID = useSelector(selector)
        const [object, setObject] = useState<T>()

        useEffect(() => {
            const result: T = withItem(objectsByID , objectID, (object : T) => object, undefined)
            if (result) {
                setObject(result)
            }
        }, [objectsByID, objectID])
        
        if (object) {
            return render(object)
        } else {
            if (placeholder) {
                return placeholder
            } else {
                return null
            }
        }
    }

	return WithItemRenderComponent
}


export const WithContainerRenderComponent = WithItemRenderComponentFactory<typeof withContainer, Container>(withContainer, selectContainersByID)
export const WithIndividualRenderComponent = WithItemRenderComponentFactory<typeof withIndividual, Individual>(withIndividual, selectIndividualsByID)
export const WithProjectRenderComponent = WithItemRenderComponentFactory<typeof withProject, Project>(withProject, selectProjectsByID)
export const WithSampleRenderComponent = WithItemRenderComponentFactory<typeof withSample, Sample>(withSample, selectSamplesByID)
export const WithUserRenderComponent = WithItemRenderComponentFactory<typeof withUser, User>(withUser, selectUsersByID)


/*
import { Menu, Typography } from 'antd'

const { Title } = Typography

const ExampleComponent = ({sampleID}) => {

    return (
		<Menu>
			<WithSampleRenderComponent 
				objectID={sampleID} 
				render={(sample) => {return (<Title>{sample.name}</Title>)}}
				placeholder={<Title>Loading...</Title>}
			/>
			... other content
		</Menu>
    )
} 
*/