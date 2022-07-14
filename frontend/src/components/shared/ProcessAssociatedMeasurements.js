import React from "react";
import {connect} from "react-redux";
import {Link, useParams} from "react-router-dom";

import FilteredList from "../FilteredList";

import {withSample} from "../../utils/withItem";
import { listFilter } from "../../modules/processMeasurements/actions";
import {listPropertyValues} from "../../modules/experimentRuns/actions";
import { PROCESS_MEASUREMENT_FILTERS } from "../filters/descriptions";

const hasEveryProperties = (processMeasurement, propertyValuesByID) => {
  return processMeasurement?.properties?.every(property => property in propertyValuesByID)
}

const getTableColumns = (samplesByID, properties, propertyValuesById) => {
  return [
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
          return <>{propertyValue?.value ?? (hasEveryProperties(processMeasurement, propertyValuesById) ? "N/A" : "Loading...")}</>
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

  const measurementsWithMissingProperties = processMeasurements.filter((id) => id in processMeasurementsByID)
                                                   .map((id) => processMeasurementsByID[id])
                                                   .filter((p) => !hasEveryProperties(p, propertyValuesByID))

  if (measurementsWithMissingProperties.length > 0) {
    listPropertyValues({ object_id__in: measurementsWithMissingProperties, content_type__model: "processmeasurement" })
  }

  const measurementsWithProperties = processMeasurements.filter((processMeasurementID) => processMeasurementID in processMeasurementsByID)
                                                        .map((processMeasurementID) => processMeasurementsByID[processMeasurementID])
                                                        .filter((processMeasurement) => hasEveryProperties(processMeasurement, propertyValuesByID))

  // potential memory overflow?
  const properties = Object.values(measurementsWithProperties.flatMap(({ properties }) => properties)
                                                             .map((propertyValueID) => propertyValuesByID[propertyValueID])
                                                             .reduce((prev, { property_name, property_type }) => {
                                                               return {
                                                                 ...prev,
                                                                 [property_type]: {
                                                                   property_name,
                                                                   property_type,
                                                                 },
                                                               }
                                                             }, []))

  const columns = getTableColumns(samplesByID, properties, propertyValuesByID)

  return <>
    <FilteredList
      description={PROCESS_MEASUREMENT_FILTERS}
      columns={columns}
      listFilter={listFilter}
      items={processMeasurements}
      itemsByID={processMeasurementsByID}
      totalCount={totalCount}
      filterID={id}
      filterKey={filterKey}
      rowKey="id"
      isFetching={isFetching}
      page={page}
      style={{ display: isFetching ? 'none ': null }}
    />
  </>
}

export default connect(mapStateToProps, actionCreators)(ProcessAssociatedMeasurements);
