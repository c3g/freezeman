import React from "react";
import { FILTER_TYPE } from "../../constants";
import { FilterDescription, FilterSet, FilterValue, RangeFilterValue, StringArrayFilterValue, isMetadataFilterValue, isRangeFilterValue, isStringArrayFilterValue } from "../../models/paged_items";

interface FiltersInfosProps {
    filters: FilterSet
}

const FiltersInfos = ({ filters }: FiltersInfosProps) => {
    const appliedFilters = Object.keys(filters).filter(key => filters[key]?.value)
    const getValue = (key: string) => {
        const filterValue: FilterValue = filters[key].value ?? {}
        const description: FilterDescription = filters[key].description ?? { type: '', key: '', label: '' }
        let valueJSX;
        if (description && filterValue) {
            const descriptionJSX = (
                <>
                    {
                        <strong>{description.label}: </strong>
                    }
                </>
            );

            switch (description.type) {
                case FILTER_TYPE.SELECT: {
                    if (isStringArrayFilterValue(filterValue)) {
                        const arrayValues = filterValue.map((val: string) => {
                            if (description.options) {
                                const option = description.options.find(option => option.value === val)
                                return option ? option.label : null
                            } else {
                                return val
                            }
                        }
                        )
                        valueJSX = arrayValues.join(', ')
                    } else {
                        valueJSX = filterValue;
                    }
                    break;
                }
                case FILTER_TYPE.RANGE:
                case FILTER_TYPE.DATE_RANGE: {
                    if (isRangeFilterValue(filterValue)) {
                        let value = "";
                        if (filterValue.min !== undefined) { value += ` min: ${filterValue.min}` }
                        if (filterValue.max !== undefined) { value += ` max: ${filterValue.max}` }
                        if (value !== "") {
                            valueJSX = value
                            break;
                        }
                        throw new Error('MIN and MAX values not defined for Filter range')
                    }
                }
                case FILTER_TYPE.METADATA: {
                    if (isMetadataFilterValue(filterValue)) {
                        valueJSX = filterValue.reduce((metadataString: any, metadata: any) => {
                            return (
                                <>
                                    {metadataString + metadata.name + ": " + (metadata.value ? metadata.value : "*") + ', '}
                                </>
                            )
                        }, '')
                    }
                    break;
                }
                default: {
                    valueJSX = filterValue
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
        } else {
            return null
        }
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
