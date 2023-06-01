import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { FMSTrackedModel } from '../../models/fms_api_models'
import { Container, Coordinate, Index, Individual, ItemsByID, Process, Project, Sample, Sequence, Taxon, User } from '../../models/frontend_models'
import { selectContainersByID, selectCoordinatesByID, selectIndicesByID, selectIndividualsByID, selectProcessesByID, selectProjectsByID, selectSamplesByID, selectSequencesByID, selectTaxonsByID, selectUsersByID } from '../../selectors'
import { createWithItem, withContainer, withCoordinate, withIndex, withIndividual, withProcess, withProject, withSample, withSequence, withTaxon, withUser } from '../../utils/withItem'

/**
 * WithItemRenderComponent
 * 
 * WithItemRenderComponent is used where we need to load an object from the backend if it
 * is not already in the redux store. It handles loading the object and when it is ready
 * it passes the object to a render function that you provide. 
 * 
 * There are specific WithXXXRenderComponent components for samples, containers, etc...
 * 
 * The component takes these props:
 * 
 * objectID: The ID of the object you want to render.
 * render: A function that takes the object as a parameter and returns a React.Element.
 * placeholder: A React element that is displayed as a placeholder until the object has been loaded.
 * 
 * Example: 
 * 
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


type WithItemFunc = ReturnType<typeof createWithItem>
type ItemRenderFunc<T extends FMSTrackedModel> = (item: T) => React.ReactElement
type ItemsByIDSelectorFunc<T extends FMSTrackedModel> = (state: any) => ItemsByID<T>

/**
 * This factory function returns a component function for rendering a specific type of object (Sample, Container, etc.).
 * The withItem and selector functions are curried into the component function.
 * 
 * @param withItem The `withXXX` function that matches the object type (eg withSample or withContainer)
 * @param selector The selector function for the `itemsByID` state that matches the object type (eg selectSamplesByID)
 * @returns A pure React component function.
 */
function WithItemRenderComponentFactory<W extends WithItemFunc, T extends FMSTrackedModel>(withItem: W, selector: ItemsByIDSelectorFunc<T>) {

	interface WithItemRenderComponentProps<T extends FMSTrackedModel> {
		objectID: string | number
		render: ItemRenderFunc<T>
		placeholder?: React.ReactElement | string
	}

    const WithItemRenderComponent = ({ objectID, render, placeholder }: WithItemRenderComponentProps<T>) => {
        const objectsByID = useSelector(selector)
        const [object, setObject] = useState<T>()

        useEffect(() => {
            if (objectID && objectsByID) {
                const result: T = withItem(objectsByID, `${objectID}`, (object: T) => object, undefined)
                if (result) {
                    setObject(result)
                }
            }
        }, [objectsByID, objectID])

        if (object) {
            return render(object)
        } else {
            if (placeholder) {
                if (typeof placeholder === 'string') {
                    return <span>placeholder</span>
                } else return placeholder
            } else {
                return null
            }
        }
    }

    return WithItemRenderComponent
}

export const WithCoordinateRenderComponent = WithItemRenderComponentFactory<typeof withCoordinate, Coordinate>(withCoordinate, selectCoordinatesByID)
export const WithContainerRenderComponent = WithItemRenderComponentFactory<typeof withContainer, Container>(withContainer, selectContainersByID)
export const WithIndexRenderComponent = WithItemRenderComponentFactory<typeof withIndex, Index>(withIndex, selectIndicesByID)
export const WithIndividualRenderComponent = WithItemRenderComponentFactory<typeof withIndividual, Individual>(withIndividual, selectIndividualsByID)
export const WithProcessRenderComponent = WithItemRenderComponentFactory<typeof withProcess, Process>(withProcess, selectProcessesByID)
export const WithProjectRenderComponent = WithItemRenderComponentFactory<typeof withProject, Project>(withProject, selectProjectsByID)
export const WithSampleRenderComponent = WithItemRenderComponentFactory<typeof withSample, Sample>(withSample, selectSamplesByID)
export const WithSequenceRenderComponent = WithItemRenderComponentFactory<typeof withSequence, Sequence>(withSequence, selectSequencesByID)
export const WithUserRenderComponent = WithItemRenderComponentFactory<typeof withUser, User>(withUser, selectUsersByID)
export const WithTaxonRenderComponent = WithItemRenderComponentFactory<typeof withTaxon, Taxon>(withTaxon, selectTaxonsByID)

