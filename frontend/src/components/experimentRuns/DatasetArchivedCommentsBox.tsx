import React, { useState, useEffect } from "react"
import { LeftCircleOutlined, RightCircleOutlined } from "@ant-design/icons"
import { Button, Tag, Row, Col, Typography, Tooltip } from 'antd'

import { Dataset } from "../../models/frontend_models"
import { FMSId } from "../../models/fms_api_models"
import ArchivedCommentsBox from "../shared/ArchivedCommentsBox"

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
  outerWidth: "flex"
}

export default function DatasetArchivedCommentsBox({datasets, handleAddComment}: DatasetCommentsProps) {
  const [datasetIndex, setDatasetIndex] = useState<number>(0)
  const [currentDataset, setCurrentDataset] = useState<Dataset>()

  useEffect(() => {
    datasets && setCurrentDataset(datasets[datasetIndex])
  }, [datasets])

  const handlePreviousDataset = () => {
    setDatasetIndex(datasetIndex - 1)
  }

  const handleNextDataset = () => {
    setDatasetIndex(datasetIndex + 1)
  }

  const handleDatasetAddComment = (comment) => {
    currentDataset && handleAddComment(currentDataset.id, comment)
  }

	return (
    <>
      <Row justify="space-between">
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="Previous Project"><Button icon={<LeftCircleOutlined/>} onClick={handlePreviousDataset} disabled={datasetIndex==0}/></Tooltip>
          <Tag style={styleTag}><Title level={5}><Text strong>{currentDataset && currentDataset.project_name}</Text></Title></Tag>
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