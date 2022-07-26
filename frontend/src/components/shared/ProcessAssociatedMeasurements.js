import React, { useEffect } from "react";
import {connect} from "react-redux";
import {Link, useParams} from "react-router-dom";

import { useFilteredList } from "../../hooks/useFilteredList";
import PaginatedList from "./PaginatedList";

import {withSample} from "../../utils/withItem";
import { listFilter } from "../../modules/processMeasurements/actions";
import {listPropertyValues} from "../../modules/experimentRuns/actions";
import { PROCESS_MEASUREMENT_FILTERS } from "../filters/descriptions";
import { Spin } from "antd";

const allPropertiesLoaded = (processMeasurement, propertyValuesByID) => {
  return processMeasurement?.properties?.every(property => property in propertyValuesByID)
}

/**
 * 
 * @param {any} processMeasurements 
 * @param {any} processMeasurementsByID 
 * @param {any} propertyValuesByID 
 * @returns An array of property values where the property type is unique.
 */
const getPropertyValuesFromMeasurements = (processMeasurements, processMeasurementsByID, propertyValuesByID) => {
  const measurementsWithProperties = processMeasurements.filter((processMeasurementID) => processMeasurementID in processMeasurementsByID)
                                                        .map((processMeasurementID) => processMeasurementsByID[processMeasurementID])
                                                        .filter((processMeasurement) => allPropertiesLoaded(processMeasurement, propertyValuesByID))

  return Object.values(measurementsWithProperties.flatMap(({ properties }) => properties)
  .map((propertyValueID) => propertyValuesByID[propertyValueID])
  .reduce((prev, { property_name, property_type }) => {
    return {
      ...prev,
      [property_type]: {
        property_name,
        property_type,
      },
    }
  }, {}))
}

const getTableColumns = (samplesByID, properties, propertyValuesById) => {
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
    ...properties.map((property) => {
      return {
        title: property.property_name,
        dataIndex: property.property_type,
        render: (_, processMeasurement) => {

          const propertyValueId = processMeasurement?.properties?.find((id) => {
            const prop = propertyValuesById[id] || {}
            return prop.property_type === property.property_type
          })

          const propertyValue = propertyValueId ? propertyValuesById[propertyValueId] : {}
          return <>{propertyValue?.value ?? (allPropertiesLoaded(processMeasurement, propertyValuesById) ? "" : "Loading...")}</>
        }
      }
    })
  ]
}

const mapStateToProps = state => ({
  isFetching: [state.processMeasurements.isFetching, state.propertyValues.isFetching].some((f) => f),
  page: state.processMeasurements.page,
  processMeasurements: state.processMeasurements.filteredItems,
  processMeasurementsByID: state.processMeasurements.itemsByID,
  samplesByID: state.samples.itemsByID,
  sortBy: state.processMeasurements.sortBy,
  totalCount: state.processMeasurements.filteredItemsCount,
  propertyValuesByID: state.propertyValues.itemsByID,
});

const actionCreators = {listFilter, listPropertyValues};

const ProcessAssociatedMeasurements = ({
  isFetching,
  listFilter,
  page,
  processMeasurements,
  processMeasurementsByID,
  samplesByID,
  totalCount,
  propertyValuesByID,
  listPropertyValues,
  id,
}) => {
  const filterKey = PROCESS_MEASUREMENT_FILTERS.process.key

  const propertyValues = getPropertyValuesFromMeasurements(processMeasurements, processMeasurementsByID, propertyValuesByID)

  const columns = getTableColumns(samplesByID, propertyValues, propertyValuesByID)

  useEffect(() => {
    const measurementsWithMissingProperties = processMeasurements.filter((id) => id in processMeasurementsByID)
                                                                 .filter((id) => !allPropertiesLoaded(processMeasurementsByID[id], propertyValuesByID))

    if (measurementsWithMissingProperties.length > 0) {
      listPropertyValues({ object_id__in: processMeasurements.join(","), content_type__model: "processmeasurement" })
    }
  }, [processMeasurements, propertyValuesByID])

  const props = useFilteredList({
    description: PROCESS_MEASUREMENT_FILTERS,
    columns: columns,
    listFilter: listFilter,
    items: processMeasurements,
    itemsByID: processMeasurementsByID,
    totalCount: totalCount,
    filterID: id,
    filterKey: filterKey,
    rowKey: "id",
    isFetching: isFetching,
    page: page,
  })

  if (propertyValues.length > 0) {
    return <PaginatedList {...props}/>
  } else if (isFetching || props.tableProps.loading) {
    return <Spin />
  } else {
    return <>No sample specific properties associated with the protocol.</>
  }
}

export default connect(mapStateToProps, actionCreators)(ProcessAssociatedMeasurements);
