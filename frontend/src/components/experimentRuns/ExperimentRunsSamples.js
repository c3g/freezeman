import React, { Fragment } from "react";
import {connect} from "react-redux";

import {Typography, List} from "antd";
import {withSample} from "../../utils/withItem";
import {Link} from "react-router-dom";
import {CheckCircleTwoTone, CloseCircleTwoTone} from "@ant-design/icons";
const {Text} = Typography;

import {list as listProcessMeasurements} from "../../modules/processMeasurements/actions";


const renderSample = (sample, sampleKind) => {
  return (
    <>
       <Link to={`/samples/${sample.id}`} >
         {sample.depleted ?
            <CloseCircleTwoTone twoToneColor="#eb2f96" /> :
            <CheckCircleTwoTone twoToneColor="#52c41a" />
         }
         {' '}
        <b>{sample.name}</b> sample ({sampleKind}){' '}
        {sample.coordinates &&
          `@ ${sample.coordinates}`
        }
      </Link>
    </>
  )
}

const renderProcessMeasurement = (processMeasurement) =>
    <>{processMeasurement.volume_used} µL</>

const renderListHeader = (container) => {
  return (
      <>
        <Text strong>
            Samples inside container <Link to={`/containers/${container.id}`}> {container.name} </Link>
        </Text>
        <Text strong style={{ display: 'block', textAlign: 'right' }}>
            Volume used
        </Text>
      </>
  )
}

const mapStateToProps = state => ({
  samplesByID: state.samples.itemsByID,
  sampleKindsByID: state.sampleKinds.itemsByID,
  processMeasurementsByID: state.processMeasurements.itemsByID,
});

const actionCreators = {listProcessMeasurements};

const ExperimentRunsSamples = ({
  container,
  experimentRun,
  samplesByID,
  sampleKindsByID,
  processMeasurementsByID,
  listProcessMeasurements,
}) => {
  const samplesData = container ? container.samples : undefined

  const isProcessMeasurementsLoaded = experimentRun && Object.values(processMeasurementsByID).some(pm => pm.process == experimentRun.process)

  if (experimentRun && !isProcessMeasurementsLoaded)
    listProcessMeasurements({process: experimentRun.process})

  const processMeasurements =
    isProcessMeasurementsLoaded ? Object.values(processMeasurementsByID).filter(pm => pm.process == experimentRun.process) : undefined

  const renderPMsForSampleID = (sampleID) => {
      if (isProcessMeasurementsLoaded && sampleID && processMeasurements) {
          return processMeasurements.filter(pm => pm.child_sample == sampleID).map(pm => <Fragment key={pm.id}>{renderProcessMeasurement(pm)}</Fragment>)
      }
      else
          return [<Fragment key={""}></Fragment>]
  }

  return (
      <>
        <List
          itemLayout="horizontal"
          header={renderListHeader(container)}
          dataSource={samplesData}
          renderItem={sampleId => {
            const id = withSample(samplesByID, sampleId, sample => sample.id, 'Loading...')
            const sample = samplesByID[id]
            return <List.Item key={sampleId}>
                <div>
                  {sample ?
                      renderSample(sample, sampleKindsByID[sample.sample_kind]?.name) :
                      <>
                        <Link to={`/samples/${sampleId}`}> Sample </Link> {' '}
                        <Text type="secondary">
                          loading...
                        </Text>
                      </>
                  }
                </div>
                <div>
                    {renderPMsForSampleID(sampleId)}
                </div>

            </List.Item>
          }}
        />
      </>
  )

};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsSamples);