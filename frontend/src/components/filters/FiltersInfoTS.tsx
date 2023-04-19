import React from "react";
import { FILTER_TYPE } from "../../constants";


const FiltersInfos = ({
    filters,
}) => {
    const appliedFilters = Object.keys(filters).filter((key: any) => filters[key]?.value)
    const getValue = (key: any) => {
        const filterValue = filters[key].value
        const description: any = filters[key].description
        let valueJSX: any;
        const descriptionJSX: any = (
            <>
                {
                    <strong>{description.label}: </strong>
                }
            </>
        );
        const valuesArray = [].concat(filterValue)
        let labels: any = [];
        let value = ""
        switch (description.type) {
            case FILTER_TYPE.SELECT:
                labels = valuesArray.map((val: any) => {
                    if (description.options) {
                        const option = description.options.find((option: { value: any }) => option.value === val)
                        valueJSX = option.label
                    } else {
                        valueJSX = val
                    }
                }
                )
                valueJSX = labels.join(', ')
                break;
            case FILTER_TYPE.RANGE:
            case FILTER_TYPE.DATE_RANGE:
                if (filterValue.min !== undefined) { value += ` min: ${filterValue.min}` }
                if (filterValue.max !== undefined) { value += ` max: ${filterValue.max}` }
                if (value !== ""){
                    valueJSX = value
                    break;
                }
                throw new Error('MIN and MAX values not defined for Filter range')
            case FILTER_TYPE.METADATA:
                valueJSX = valuesArray.reduce((metadataString: any, metadata: any) => {
                    return (
                        <>
                            {metadataString + metadata.name + ": " + (metadata.value ? metadata.value : "*") + ', '}
                        </>
                    )
                }, '')
                break;
            default:
                valueJSX = valuesArray.join(', ')
                break;
        }
        return (
            <>
                {
                    descriptionJSX
                }
                {
                    valueJSX
                }
            </>
        )
    }

    return (
        <>
            {appliedFilters.map((key, index) => (
                <div key={`${key}${index}`}>
                    {getValue(key)}
                </div>
            ))}
        </>
    )
}

export default FiltersInfos;
