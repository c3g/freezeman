import { useEffect, useState } from "react"
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
} from "../utils/withItem"

/**
 * A hook that wraps any functions created with `createWithItem`
 * and ensures that the function is called inside the `useEffect` hook.
 * @param {(any, any, any, any) => any} withItem a function created by `createWithItem`
 * @returns A hook that looks and behaves like a function created by `createWithItem`
 */
export const useItem = (withItem) => (itemsByID, id, fn, defaultValue = null) => {
    const [value, setValue] = useState(defaultValue)

    useEffect(() => {
        setValue(withItem(itemsByID, id, fn, defaultValue))
    }, [itemsByID, id])

    return value
}

export const useContainer = useItem(withContainer)
export const useSample = useItem(withSample)
export const useIndividual = useItem(withIndividual)
export const useUser = useItem(withUser)
export const useProcessMeasurement = useItem(withProcessMeasurement)
export const useProject = useItem(withProject)
export const useSequence = useItem(withSequence)
export const useIndex = useItem(withIndex)
export const useLibrary = useItem(withLibrary)
export const useTaxon = useItem(withTaxon)

export default {
    useContainer,
    useSample,
    useIndividual,
    useUser,
    useProcessMeasurement,
    useProject,
    useSequence,
    useIndex,
    useLibrary,
    useTaxon,
}