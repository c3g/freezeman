import React, { useState, useEffect } from "react"

import { Button, Tag, Row, Col } from 'antd'
import { Dataset } from "../../models/frontend_models"
import ArchivedCommentsBox from "../shared/ArchivedCommentsBox"
import { LeftCircleOutlined, RightCircleOutlined } from "@ant-design/icons"

interface DatasetCommentsProps {
  datasets: Dataset[]
  handleAddComment: Function
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
    datasets && !currentDataset && setCurrentDataset(datasets[datasetIndex])
  }, [datasets])

  const handlePreviousDataset = () => {
    setDatasetIndex(datasetIndex - 1)
  }

  const handleNextDataset = () => {
    setDatasetIndex(datasetIndex + 1)
  }

	return (
    <>
      <Row justify="space-between">
        <Col style={{alignItems: "left"}} span={2}>
          <Button icon={<LeftCircleOutlined/>} onClick={handlePreviousDataset} disabled={datasetIndex==0}/>
        </Col>
        <Col style={{alignItems: "center"}} span={20}>
          <Tag style={styleTag}>{currentDataset && currentDataset.project_name}</Tag>
        </Col>
        <Col style={{alignItems: "right"}} span={2}>
          <Button icon={<RightCircleOutlined/>} onClick={handlePreviousDataset} disabled={datasetIndex==(datasets.length - 1)}/>
        </Col>
      </Row>
      <Row style={{height: 8}}></Row>
      <Row style={{height: "100%"}}>
        <Col span={24}>
          <ArchivedCommentsBox comments={currentDataset?.archived_comments} handleAddComment={handleAddComment} />
        </Col>
      </Row>
    </>
	)
}