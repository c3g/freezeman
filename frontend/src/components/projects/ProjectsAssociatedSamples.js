import { Spin, Tag } from "antd";
import React, { useCallback, useState } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import FilteredList from "../FilteredList";
import { listFilter } from "../../modules/samples/actions";
import api from "../../utils/api";
import { Depletion } from "../Depletion";
import { SAMPLE_FILTERS } from "../filters/descriptions";
import { WithIndividualRenderComponent } from "../shared/WithItemRenderComponent";
import { selectAppInitialzed } from "../../selectors";
import { useAppSelector } from "../../hooks";

const listProcessMeasurements = api.processMeasurements.list;

const getTableColumns = (sampleKinds, protocolNamesBySampleID) => [
    {
      title: "Sample Kind",
      dataIndex: "derived_samples__sample_kind__name",
      sorter: true,
      width: 70,
      options: sampleKinds.items.map(x => ({ label: x.name, value: x.name })), // for getFilterProps
      render: (_, sample) =>
        {return <Tag>{sample.sample_kind ? sampleKinds.itemsByID[sample.sample_kind].name : "POOL"}</Tag>}
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: true,
      width: 170,
      render: (name, sample) =>
        <Link to={`/samples/${sample.id}`}>
          <div>{name}</div>
          {sample.alias &&
            <div><small>alias: {sample.alias}</small></div>
          }
        </Link>,
    },
    {
      title: "Cohort",
      dataIndex: "derived_samples__biosample__individual__cohort",
      sorter: true,
      width: 130,
      render: (_, sample) => {
        const individual = sample.individual
        return (individual &&
          <Link to={`/individuals/${individual}`}>
            <WithIndividualRenderComponent objectID={individual} render={individual => <>{individual.cohort}</>} placeholder={"Loading..."}/>
          </Link>)
      }
    },
    {
      title: "Vol. (µL)",
      dataIndex: "volume",
      sorter: true,
      align: "right",
      className: "table-column-numbers",
      width: 70,
    },
    {
      title: "Creation Date",
      dataIndex: "creation_date",
      sorter: true,
      width: 115,
    },
    {
    title: "Last Protocol",
    dataIndex: "id",
    width: 170,
    render: (id) => <>{protocolNamesBySampleID[id]}</>
  },
  {
      title: "Depleted",
      dataIndex: "depleted",
      sorter: true,
      render: depleted => <Depletion depleted={depleted} />,
      width: 50,
    }
  ];

const mapStateToProps = state => ({
  sampleKinds: state.sampleKinds,
  page: state.samples.page,
  samplesByID: state.samples.itemsByID,
  samples: state.samples.filteredItems,
  totalCount: state.samples.filteredItemsCount,
  isFetching: state.samples.isFetching,
  protocolsByID: state.protocols.itemsByID,
});

const actionCreators = { listFilter, listProcessMeasurements };

const ProjectsAssociatedSamples = ({
  projectID,
  samplesByID,
  samples,
  totalCount,
  sampleKinds,
  isFetching,
  page,
  protocolsByID,
  listFilter,
  listProcessMeasurements,
}) => {
  const isInitialized = useAppSelector(selectAppInitialzed)
  const [protocolNamesBySampleID, setProtocolNamesBySampleID] = useState({})
  
  const myListFilter = useCallback(async (...args) => {
    const response = await listFilter(...args)
    if (!response) {
      return response;
    }
    const processMeasurements = (await listProcessMeasurements({ lineage__child__id__in: response.results.map(sample => sample.id).join(",") })).data.results
    const protocolIdsBySampleId = Object.fromEntries(processMeasurements.map((pm) => [pm.child_sample, pm.protocol]))
    const protocolNamesByProtocolIds = Object.fromEntries(Object.values(protocolIdsBySampleId).map(protocolId => [protocolId, isInitialized ? protocolsByID[protocolId].name : "Loading..."]))
    setProtocolNamesBySampleID(Object.fromEntries(
      Object.entries(protocolIdsBySampleId).map(([sampleid, protocolid]) => [sampleid, protocolNamesByProtocolIds[protocolid]])
    ))
    return response
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, protocolsByID])

  const filterKey = SAMPLE_FILTERS.derived_samples__project__id.key
  const columns = getTableColumns(sampleKinds, protocolNamesBySampleID)

  return <>
    {
      <FilteredList
        description={SAMPLE_FILTERS}
        columns={columns}
        listFilter={myListFilter}
        items={samples}
        itemsByID={samplesByID}
        totalCount={totalCount}
        filterID={projectID}
        filterKey={filterKey}
        rowKey="id"
        isFetching={isFetching}
        page={page}
        isOtherFetching={!isInitialized}
      />
   }
  </>;
}

export default connect(mapStateToProps, actionCreators)(ProjectsAssociatedSamples);
