import React, { useEffect } from "react";
import {connect} from "react-redux";
import {Link, useParams} from "react-router-dom";

import { useFilteredList } from "../../hooks/useFilteredList";
import PaginatedList from "./PaginatedList";

import WITH_ITEM from "../../utils/withItem";
import { listFilter } from "../../modules/processMeasurements/actions";
import {listPropertyValues} from "../../modules/experimentRuns/actions";
import { PROCESS_MEASUREMENT_FILTERS } from "../filters/descriptions";
import { withItemWrapper } from "../shared/WithItemComponent"

const allPropertiesLoaded = (processMeasurement, propertyValuesByID) => {
  return processMeasurement?.properties?.every(property => property in propertyValuesByID)
}

const getTableColumns = (samplesByID, property_types, propertyValuesById) => {
  const withSample = withItemWrapper(WITH_ITEM.withSample)

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
  ].map((column) => ({ ...column, key: column.title }))
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
  protocolsByID: state.protocols.itemsByID,
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
  process,
  protocolsByID,
}) => {
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

  if (sample_property_types.length > 0) {
    return <PaginatedList {...props}/>
  } else {
    return <>No sample specific properties associated with the protocol.</>
  }
}

export default connect(mapStateToProps, actionCreators)(ProcessAssociatedMeasurements);
