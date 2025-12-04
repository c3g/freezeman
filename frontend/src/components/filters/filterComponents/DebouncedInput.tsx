import React, { useEffect, useState } from 'react'
import { Input } from 'antd'
import { useDebounce } from '../../../utils/functions'


export interface DebouncedInputProps extends React.ComponentProps<typeof Input> {
    value: string | undefined
    debounceDelay?: number
    onInputChange: (value: string) => void
}

// DebouncedInput uses a forwardRef. This allows a ref to created by the component
// using DebouncedInput that gets passed down to the Input element.
const DebouncedInput = ({ value, onInputChange, debounceDelay, ...rest }: DebouncedInputProps, ref: React.ForwardedRef<any>) => {

    // The input box keeps its current value in this state.
    // The value is initialized with the filter value received as props, but
    // the text is independent of the filter value (so that the user can type without
    // triggering a fetch request on every keystroke).
    const [filterText, setFilterText] = useState(value)

    // Create a debounced version of onChange
    const debouncedOnChange = useDebounce(onInputChange, debounceDelay)

    // Reset the filter text if value has changed - normally because the user has cleared
    // all filters and the filter value has been reset to undefined.
    // While the user is typing the filterState will be ahead of value, but once the
    // user stops typing then setFilter is called and the value is updated and
    // will match filterState.
    useEffect(() => {
        if (filterText !== value) {
            setFilterText(value)
        }
    }, [value])

    // Update filterText and trigger a debounced onChange call
    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        const text = event.target.value
        setFilterText(text)
        debouncedOnChange(text)
    }

    return (
        <Input ref={ref} value={filterText} onChange={handleChange} {...rest}/>
    )
}

// Returns a forward ref so that callers can get a ref in the Input component.
// We need a ref so that we can automatically focus the input element whenever
// it becomes visible.
export default React.forwardRef(DebouncedInput)