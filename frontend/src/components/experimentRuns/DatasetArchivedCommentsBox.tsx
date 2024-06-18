import React, { useState, useEffect, useCallback } from "react"
import { LeftCircleOutlined, RightCircleOutlined } from "@ant-design/icons"
import { Button, Tag, Row, Col, Typography, Tooltip } from 'antd'

import { Dataset } from "../../models/frontend_models"
import { FMSId } from "../../models/fms_api_models"
import ArchivedCommentsBox from "../shared/ArchivedCommentsBox"
import FixedLengthText, { MIDDLE_ELIPSIS } from "../FixedLengthText"

const { Text, Title } = Typography

interface DatasetCommentsProps {
  datasets: Dataset[]
  handleAddComment: (id: FMSId, comment: string) => void
}

const styleTag = {
  verticalAlign: "middle",
  justifyText: "center",
  margin: "0 2px",
  height: "32px",
  outerWidth: "flex",
  paddingTop: "3px"
}

export default function DatasetArchivedCommentsBox({datasets, handleAddComment}: DatasetCommentsProps) {
  const [datasetIndex, setDatasetIndex] = useState<number>(0)
  const [currentDataset, setCurrentDataset] = useState<Dataset>()

  useEffect(() => {
    datasets && setCurrentDataset(datasets[datasetIndex])
  }, [datasets, datasetIndex])

  const handlePreviousDataset = useCallback(() => {
    setDatasetIndex(datasetIndex - 1)
  }, [datasetIndex])

  const handleNextDataset = useCallback(() => {
    setDatasetIndex(datasetIndex + 1)
  }, [datasetIndex])

  const handleDatasetAddComment = useCallback((comment) => {
    currentDataset && handleAddComment(currentDataset.id, comment)
  }, [currentDataset, handleAddComment])

	return (
    <>
      <Row justify="space-between">
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="Previous Project"><Button icon={<LeftCircleOutlined/>} onClick={handlePreviousDataset} disabled={datasetIndex==0}/></Tooltip>
          <Tag style={styleTag}><Title level={5}><Text strong>{currentDataset && <FixedLengthText text={currentDataset.project_name} fixedLength={36} elipsisPosition={MIDDLE_ELIPSIS} />}</Text></Title></Tag>
          <Tooltip title="Next Project"><Button icon={<RightCircleOutlined/>} onClick={handleNextDataset} disabled={datasetIndex==(datasets.length - 1)}/></Tooltip>
        </div>
      </Row>
      <Row style={{height: 8}}></Row>
      <Row style={{height: "100%"}}>
        <Col span={24}>
          <ArchivedCommentsBox comments={currentDataset?.archived_comments} handleAddComment={handleDatasetAddComment} />
        </Col>
      </Row>
    </>
	)
}