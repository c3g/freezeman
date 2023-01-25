import { Tag } from "antd";
import React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import FilteredList from "../FilteredList";
import { listFilter } from "../../modules/samples/actions";
import { Depletion } from "../Depletion";
import { SAMPLE_FILTERS } from "../filters/descriptions";
import { WithIndividualRenderComponent } from "../shared/WithItemRenderComponent";

const getTableColumns = (sampleKinds) => [
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
});

const actionCreators = {listFilter};

const ProjectsAssociatedSamples = ({
  projectID,
  samplesByID,
  samples,
  totalCount,
  sampleKinds,
  isFetching,
  page,
  listFilter,
}) => {

  const filterKey = SAMPLE_FILTERS.derived_samples__project__id.key

  const columns = getTableColumns(sampleKinds)

  return <>
    <FilteredList
      description={SAMPLE_FILTERS}
      columns={columns}
      listFilter={listFilter}
      items={samples}
      itemsByID={samplesByID}
      totalCount={totalCount}
      filterID={projectID}
      filterKey={filterKey}
      rowKey="id"
      isFetching={isFetching}
      page={page}
    />
  </>;
}

export default connect(mapStateToProps, actionCreators)(ProjectsAssociatedSamples);
