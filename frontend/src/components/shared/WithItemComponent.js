import React from "react"
import { useItem } from "../../hooks/useItem"
import { 
    withContainer,
    withSample,
    withIndividual,
    withUser,
    withProcessMeasurement,
    withProject,
    withSequence,
    withIndex,
    withLibrary,
    withTaxon
} from "../../utils/withItem"

/**
 * 
 * @param {(any, any, any, any) => any} withItem a function created by `createWithItem`
 * @returns
 * A function that looks like a function created by `createWithItem` but it returns a React component
 * containing the value returned by `withItem` plus an optional `render` argument to change the
 * component output.
 */
const WithItemComponent = (withItem) => (itemsByID, id, fn, defaultValue = null, render = (item) => <>{item}</>) => {
    const Container = ({}) => {
        const item = useItem(withItem)(itemsByID, id, fn, defaultValue)
        return render(item)
    }

    return <Container />
}

export const withContainerComponent = WithItemComponent(withContainer)
export const withSampleComponent = WithItemComponent(withSample)
export const withIndividualComponent = WithItemComponent(withIndividual)
export const withUserComponent = WithItemComponent(withUser)
export const withProcessMeasurementComponent = WithItemComponent(withProcessMeasurement)
export const withProjectComponent = WithItemComponent(withProject)
export const withSequenceComponent = WithItemComponent(withSequence)
export const withIndexComponent = WithItemComponent(withIndex)
export const withLibraryComponent = WithItemComponent(withLibrary)
export const withTaxonComponent = WithItemComponent(withTaxon)

export default {
    withContainerComponent,
    withSampleComponent,
    withIndividualComponent,
    withUserComponent,
    withProcessMeasurement,
    withProjectComponent,
    withSequenceComponent,
    withIndexComponent,
    withLibraryComponent,
    withTaxonComponent,
}