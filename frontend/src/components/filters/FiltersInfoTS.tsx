import React from "react";
import { FILTER_TYPE } from "../../constants";
import { FilterSet, FilterValue, RangeFilterValue } from "../../models/paged_items";

interface FiltersInfosProps {
    filters: FilterSet
}

const FiltersInfos = ({ filters }: FiltersInfosProps) => {
    const appliedFilters = Object.keys(filters).filter((key: any) => filters[key]?.value)
    const getValue = (key: any) => {
        const filterValue: FilterValue = filters[key].value ?? {}
        const description: any = filters[key].description
        let valueJSX: any;
        const descriptionJSX: any = (
            <>
                {
                    <strong>{description.label}: </strong>
                }
            </>
        );
        const valuesArray = [filterValue]
        let labels: any = [];
        let value = ""
        switch (description.type) {
            case FILTER_TYPE.SELECT: {
                labels = valuesArray.map((val: any) => {
                    if (description.options) {
                        const option = description.options.find((option: { value: any }) => option.value === val)
                        return option.label
                    } else {
                        return val
                    }
                }
                )
                valueJSX = labels.join(', ')
                break;
            }
            case FILTER_TYPE.RANGE:
            case FILTER_TYPE.DATE_RANGE: {
                const filterRange: RangeFilterValue = filterValue as RangeFilterValue;
                if (filterRange.min !== undefined) { value += ` min: ${filterRange.min}` }
                if (filterRange.max !== undefined) { value += ` max: ${filterRange.max}` }
                if (value !== "") {
                    valueJSX = value
                    break;
                }
                throw new Error('MIN and MAX values not defined for Filter range')
            }
            case FILTER_TYPE.METADATA: {

                valueJSX = valuesArray.reduce((metadataString: any, metadata: any) => {
                    return (
                        <>
                            {metadataString + metadata.name + ": " + (metadata.value ? metadata.value : "*") + ', '}
                        </>
                    )
                }, '')
                break;
            }
            default: {
                valueJSX = valuesArray.join(', ')
                break;
            }
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
