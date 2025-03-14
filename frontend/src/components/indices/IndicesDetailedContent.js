import React from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Descriptions, Typography, Spin } from "antd";
const { Title } = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import DropdownListItems from "../DropdownListItems";
import TrackingFieldsContent from "../TrackingFieldsContent";

import { withSequence } from "../../utils/withItem";
import { get } from "../../modules/indices/actions";


const mapStateToProps = state => ({
  isFetching: state.indices.isFetching,
  indicesByID: state.indices.itemsByID,
  sequencesByID: state.sequences.itemsByID,
});

const mapDispatchToProps = dispatch =>
  bindActionCreators({ get }, dispatch);

const IndicesDetailedContent = ({ indicesByID, sequencesByID, isFetching, get }) => {
  const history = useNavigate();
  const { id } = useParams();
  const isLoaded = id in indicesByID;
  const index = indicesByID[id] || {};

  if (!isLoaded)
    get(id);

  const isLoading = !isLoaded;
  const title =
    `Index ${index.name}`;

  return <>
    <AppPageHeader title={title} />
    <PageContent loading={isLoading}>
      <Title level={2}>Overview</Title>
      <Descriptions bordered={true} size="small" column={4}>
        <Descriptions.Item label="Index name" span={4}>{index.name}</Descriptions.Item>
        <Descriptions.Item label="Index Sets" span={4}>{index && index.index_sets &&
          <DropdownListItems listItems={index.index_sets}
          />}
        </Descriptions.Item>
        <Descriptions.Item label="Index Structure" span={4}>{index.index_structure}</Descriptions.Item>
        <Descriptions.Item label="Sequence 3 prime (i7)" span={4}>{index && index.sequences_3prime &&
          <DropdownListItems listItems={index.sequences_3prime.map(sequence =>
            sequence && withSequence(sequencesByID, sequence, sequence => sequence.value,))}
          />}
        </Descriptions.Item>
        <Descriptions.Item label="Sequence 5 prime (i5)" span={4}>{index && index.sequences_5prime &&
          <DropdownListItems listItems={index.sequences_5prime.map(sequence =>
            sequence && withSequence(sequencesByID, sequence, sequence => sequence.value,))}
          />}
        </Descriptions.Item>
      </Descriptions>
      <TrackingFieldsContent entity={index} />
    </PageContent>
  </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(IndicesDetailedContent);
