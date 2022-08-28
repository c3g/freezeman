import { useDispatch, useSelector } from "react-redux"
import React, { useEffect } from "react";
import {connect} from "react-redux";
import {Link, useParams} from "react-router-dom";

import { useFilteredList } from "../../hooks/useFilteredList";
import PaginatedList from "./PaginatedList";

import {withSample} from "../../utils/withItem";
import { listFilter } from "../../modules/processMeasurements/actions";
import {listPropertyValues} from "../../modules/experimentRuns/actions";
import { PROCESS_MEASUREMENT_FILTERS } from "../filters/descriptions";

const allPropertiesLoaded = (processMeasurement, propertyValuesByID) => {
  return processMeasurement?.properties?.every(property => property in propertyValuesByID)
}

const getTableColumns = (samplesByID, property_types, propertyValuesById) => {
  return [
    {
      title: "Sample Process ID",
      dataIndex: "id",
      sorter: true,
      width: 175,
      render: (_, processMeasurement) =>
          <Link to={`/process-measurements/${processMeasurement.id}`}>{processMeasurement.id}</Link>
    },
    {
      title: "Sample",
      dataIndex: "source_sample__name",
      sorter: true,
      render: (_, processMeasurement) => {
        const sample = processMeasurement.source_sample
        return (sample &&
          <Link to={`/samples/${sample}`}>
            {withSample(samplesByID, sample, sample => sample.name, "loading...")}
          </Link>)
      }
    },
    ...property_types.map((property_type) => {
      return {
        title: property_type.name,
        dataIndex: property_type.id,
        render: (_, processMeasurement) => {

          const propertyValueId = processMeasurement?.properties?.find((id) => {
            const prop = propertyValuesById[id] || {}
            return prop.property_type === property_type.id
          })

          const propertyValue = propertyValueId ? propertyValuesById[propertyValueId] : {}
          return <>{propertyValue?.value ?? (allPropertiesLoaded(processMeasurement, propertyValuesById) ? "" : "Loading...")}</>
        }
      }
    })
  ]
}





const ProcessAssociatedMeasurements = ({ process }) => {
  const isFetching = useSelector((state) => [state.processMeasurements.isFetching, state.propertyValues.isFetching].some((f) => f))
  const page = useSelector((state) => state.processMeasurements.page)
  const processMeasurements = useSelector((state) => state.processMeasurements.filteredItems)
  const processMeasurementsByID = useSelector((state) => state.processMeasurements.itemsByID)
  const samplesByID = useSelector((state) => state.samples.itemsByID)
  const sortBy = useSelector((state) => state.processMeasurements.sortBy)
  const totalCount = useSelector((state) => state.processMeasurements.filteredItemsCount)
  const propertyValuesByID = useSelector((state) => state.propertyValues.itemsByID)
  const protocolsByID = useSelector((state) => state.protocols.itemsByID)
  const dispatch = useDispatch()
  const dispatchListFilter = useCallback((...args) => listFilter(...args), [dispatch])
  const dispatchListPropertyValues = useCallback((...args) => listPropertyValues(...args), [dispatch])

  const { id } = process;

  const sample_property_types = process ? protocolsByID[process.protocol].property_types.filter((property_type) => {
    return property_type.model === "processmeasurement"
  }) : [];

  const filterKey = PROCESS_MEASUREMENT_FILTERS.process.key
  
  const columns = getTableColumns(samplesByID, sample_property_types, propertyValuesByID)

  useEffect(() => {
    const measurementsWithMissingProperties = processMeasurements.filter((id) => id in processMeasurementsByID)
                                                                 .filter((id) => !allPropertiesLoaded(processMeasurementsByID[id], propertyValuesByID))

    if (measurementsWithMissingProperties.length > 0) {
      dispatchListPropertyValues({ object_id__in: processMeasurements.join(","), content_type__model: "processmeasurement" })
    }
  }, [processMeasurements, propertyValuesByID])

  const props = useFilteredList({
    description: PROCESS_MEASUREMENT_FILTERS,
    columns: columns,
    dispatchListFilter: listFilter,
    items: processMeasurements,
    itemsByID: processMeasurementsByID,
    totalCount: totalCount,
    filterID: id,
    filterKey: filterKey,
    rowKey: "id",
    isFetching: isFetching,
    page: page,
  })

  if (sample_property_types.length > 0) {
    return <PaginatedList {...props}/>
  } else {
    return <>No sample specific properties associated with the protocol.</>
  }
}

export default ProcessAssociatedMeasurements;
