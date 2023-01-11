import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { FetchedObject, ItemsByID } from '../../models/frontend_models'
import { selectSamplesByID } from '../../selectors'
import { createWithItem, withSample } from '../../utils/withItem'
import { Typography } from 'antd'
import { RootState } from '../../store'
import { FMSId } from '../../models/fms_api_models'

const { Title } = Typography

type WithItemFunc = ReturnType<typeof createWithItem>
// type SelectorFunc = <T extends FetchedObject>(state: RootState) => ItemsByID<T>

interface WithItemRenderComponentProps<T extends FetchedObject> {
    objectsByID: ItemsByID<T>
    objectID: string
    render: (item: T) => React.ReactElement
    renderDefault?: () => React.ReactElement
}

function createItemRenderComponent<W extends WithItemFunc, T extends FetchedObject> (withItem : W) {
    return ({objectsByID, objectID, render, renderDefault} : WithItemRenderComponentProps<T>) => {
        const [object, setObject] = useState<T>()

        useEffect(() => {
            const result = withItem(objectsByID, objectID, object => object, undefined)
            if (result) {
                setObject(result)
            }
        }, [objectsByID, objectID])
        
        if (object) {
            return render(object)
        } else {
            if (renderDefault) {
                return renderDefault()
            } else {
                return null
            }
        }
    }
}

interface Sample extends FetchedObject {
    name: string
}

export const WithSampleComponent = createItemRenderComponent<typeof withSample, Sample>(withSample)


const TryItComponent = ({}) => {

    const samplesByID = useSelector(selectSamplesByID)
    const sampleID = 'someid'

    return (
        <WithSampleComponent 
            objectsByID={samplesByID} 
            objectID={sampleID} 
            render={(sample) => {return (<Title>{sample.name}</Title>)}}/>
    )
} 





