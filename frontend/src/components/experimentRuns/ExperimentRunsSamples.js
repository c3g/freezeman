import React, { useEffect } from "react";
import {connect} from "react-redux";

import {Typography, List} from "antd";
import {Link} from "react-router-dom";
import {CheckCircleTwoTone, CloseCircleTwoTone} from "@ant-design/icons";
const {Text, Title} = Typography;

import {list as listProcessMeasurements} from "../../modules/processMeasurements/actions";
import { WithSampleComponent } from "../shared/WithItemComponent";


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
        <Title level={5}>
            Samples inside container <Link to={`/containers/${container.id}`}> {container.name} </Link>
        </Title>
        <Title level={5} style={{textAlign: 'right'}}>
            Volume used
        </Title>
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

  useEffect(() => {
    if (experimentRun && !isProcessMeasurementsLoaded)
      listProcessMeasurements({process: experimentRun.process})
  }, [experimentRun, isProcessMeasurementsLoaded])

  const processMeasurements =
    isProcessMeasurementsLoaded ? Object.values(processMeasurementsByID).filter(pm => pm.process == experimentRun.process) : undefined

  const renderPMsForSampleID = (sampleID) => {
      if (isProcessMeasurementsLoaded && sampleID && processMeasurements) {
          return processMeasurements.filter(pm => pm.child_sample == sampleID).map(pm => renderProcessMeasurement(pm))
      }
      else
          return [<></>]
  }

  return (
      <>
        <List
          itemLayout="horizontal"
          header={renderListHeader(container)}
          dataSource={samplesData}
          renderItem={sampleId => {
            return WithSampleComponent(samplesByID, sampleId, sample => sample.id, 'Loading...', (id) => {
              const sample = samplesByID[id]
              return (
                <List.Item>
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
              )
            })
          }}
        />
      </>
  )

};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsSamples);