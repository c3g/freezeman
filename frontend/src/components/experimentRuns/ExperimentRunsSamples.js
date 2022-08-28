import { useDispatch, useSelector } from "react-redux"
import React from "react";
import {connect} from "react-redux";

import {Typography, List} from "antd";
import {withSample} from "../../utils/withItem";
import {Link} from "react-router-dom";
import {CheckCircleTwoTone, CloseCircleTwoTone} from "@ant-design/icons";
const {Text, Title} = Typography;

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
        <Title level={5}>
            Samples inside container <Link to={`/containers/${container.id}`}> {container.name} </Link>
        </Title>
        <Title level={5} style={{textAlign: 'right'}}>
            Volume used
        </Title>
      </>
  )
}





const ExperimentRunsSamples = ({ container, experimentRun }) => {
  const samplesByID = useSelector((state) => state.samples.itemsByID)
  const sampleKindsByID = useSelector((state) => state.sampleKinds.itemsByID)
  const processMeasurementsByID = useSelector((state) => state.processMeasurements.itemsByID)
  const dispatch = useDispatch()
  const dispatchListProcessMeasurements = useCallback((...args) => listProcessMeasurements(...args), [dispatch])

  const samplesData = container ? container.samples : undefined

  const isProcessMeasurementsLoaded = experimentRun && Object.values(processMeasurementsByID).some(pm => pm.process == experimentRun.process)

  if (experimentRun && !isProcessMeasurementsLoaded)
    dispatchListProcessMeasurements({process: experimentRun.process})

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
            const id = withSample(samplesByID, sampleId, sample => sample.id, 'Loading...')
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
          }}
        />
      </>
  )

};

export default ExperimentRunsSamples;