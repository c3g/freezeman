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
export const WithItemComponent = (withItem) => (itemsByID, id, fn, defaultValue = null, render = (item) => <>{item}</>) => {
    const Container = ({}) => {
        const item = useItem(withItem)(itemsByID, id, fn, defaultValue)
        return render(item)
    }

    return <Container />
}

export const WithContainerComponent = WithItemComponent(withContainer)
export const WithSampleComponent = WithItemComponent(withSample)
export const WithIndividualComponent = WithItemComponent(withIndividual)
export const WithUserComponent = WithItemComponent(withUser)
export const WithProcessMeasurementComponent = WithItemComponent(withProcessMeasurement)
export const WithProjectComponent = WithItemComponent(withProject)
export const WithSequenceComponent = WithItemComponent(withSequence)
export const WithIndexComponent = WithItemComponent(withIndex)
export const WithLibraryComponent = WithItemComponent(withLibrary)
export const WithTaxonComponent = WithItemComponent(withTaxon)

export default {
    WithContainerComponent,
    WithSampleComponent,
    WithIndividualComponent,
    WithUserComponent,
    withProcessMeasurement,
    WithProjectComponent,
    WithSequenceComponent,
    WithIndexComponent,
    WithLibraryComponent,
    WithTaxonComponent,
}