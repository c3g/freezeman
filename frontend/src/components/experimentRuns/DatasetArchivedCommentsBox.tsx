import React, { useState, useEffect } from "react";

import { Tag } from 'antd'
import { Dataset } from "../../models/frontend_models"
import ArchivedCommentsBox from "../shared/ArchivedCommentsBox"

export default function DatasetArchivedCommentsBox(datasets: Dataset[], handleAddComment: Function) {
  const [currentDataset, setCurrentDataset] = useState<Dataset>()

  useEffect( () => {
    datasets && !currentDataset && setCurrentDataset(datasets[0])
  }, [datasets])

	return (
		<div>
      <Tag>{currentDataset && currentDataset.project_name}</Tag>
    </div>
	)
}