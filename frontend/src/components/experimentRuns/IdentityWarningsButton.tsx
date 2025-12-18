import React, { useEffect, useMemo, useState } from 'react'
import { Button, Table, Typography,  Modal, Card, Divider } from 'antd'
import { WarningTwoTone } from "@ant-design/icons"

import { FMSId } from '../../models/fms_api_models'
import { list } from '../../modules/biosamples/actions'
import { DEFAULT_PAGE_SIZE } from '../../constants'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { selectBiosamplesByID } from '../../selectors'

export const CONCORDANCE_WARNING_MESSAGE = "Tested readset data failed to match corresponding sample identity."
export const CONTAMINATION_WARNING_MESSAGE = "Tested readset data matched other sample identity. Possible contamination or Mix-up."

export class ConcordanceWarningValues {
  readset_id: FMSId
  biosample_id: FMSId
  constructor(readset_id, biosample_id){
    this.readset_id = readset_id
    this.biosample_id = biosample_id
  }
}

export class ContaminationWarningValues {
  readset_id: FMSId
  tested_biosample_id: FMSId
  matched_biosample_id: FMSId
  matching_site_ratio: number
  compared_sites: number
  constructor(readset_id, tested_biosample_id, matched_biosample_id, matching_site_ratio, compared_sites){
    this.readset_id = readset_id
    this.tested_biosample_id = tested_biosample_id
    this.matched_biosample_id = matched_biosample_id
    this.matching_site_ratio = matching_site_ratio
    this.compared_sites = compared_sites
  }
}

export class MixupAndContaminationWarnings {
  biosample_ids: Set<FMSId>
	concordance_warnings: ConcordanceWarningValues[]
	contamination_warnings: ContaminationWarningValues[]
  constructor(){
    this.biosample_ids = new Set()
    this.concordance_warnings = []
    this.contamination_warnings = []
  }
  hasWarnings(): boolean{
    return this.biosample_ids.size > 0
  }
  addConcordanceWarning(warning: ConcordanceWarningValues){
    console.log(warning)
    this.biosample_ids.add(warning.biosample_id)
    this.concordance_warnings.push(warning)
  }
  addContaminationWarning(warning: ContaminationWarningValues){
    this.biosample_ids.add(warning.tested_biosample_id)
    this.biosample_ids.add(warning.matched_biosample_id)
    this.contamination_warnings.push(warning)
  }
  fetchBiosamples(dispatch){
    const array_ids = [...this.biosample_ids]
    console.log(array_ids)
    for (let start = 0; start < array_ids.length; start = start + DEFAULT_PAGE_SIZE) {
      dispatch(list({id__in: array_ids.slice(start, start + DEFAULT_PAGE_SIZE).join(',')}))
    }
  }
}

export enum IdentityConcordanceColumnID {
	READSET_ID  = 'READSET_ID',
  SAMPLE_ALIAS = "SAMPLE_ALIAS"
}

export enum IdentityContaminationColumnID {
	READSET_ID  = 'READSET_ID',
  TESTED_SAMPLE_ALIAS = "TESTED_SAMPLE_ALIAS",
  MATCHED_SAMPLE_ALIAS = "MATCHED_SAMPLE_ALIAS",
  MATCHING_SITE_RATIO = "MATCHING_SITE_RATIO",
  COMPARED_SITES = "COMPARED_SITES"
}

export function getColumnsForConcordance(biosamplesById) {
  const columnDefinitions = CONCORDANCE_TABLE_COLUMNS(biosamplesById)
  return [
      columnDefinitions.READSET_ID,
      columnDefinitions.SAMPLE_ALIAS,
  ]
}


export const CONCORDANCE_TABLE_COLUMNS = (biosamplesById): { [key in IdentityConcordanceColumnID]: any } => ({
  [IdentityConcordanceColumnID.READSET_ID]: {
    columnID: IdentityConcordanceColumnID.READSET_ID,
    title: 'Readset ID',
    dataIndex: 'readset_id',
    key: 'readset_id',
    width: '50vw',
  },
  [IdentityConcordanceColumnID.SAMPLE_ALIAS]: {
    columnID: IdentityConcordanceColumnID.SAMPLE_ALIAS,
    title: 'Sample',
    dataIndex: 'biosample_id',
    key: 'biosample_id',
    render: (biosample_id) => biosamplesById[biosample_id] ? biosamplesById[biosample_id].alias : "Unknown",
    width: '50vw',
  }
})

export function getColumnsForContamination(biosamplesById) {
  const columnDefinitions = CONTAMINATION_TABLE_COLUMNS(biosamplesById)
  return [
      columnDefinitions.READSET_ID,
      columnDefinitions.TESTED_SAMPLE_ALIAS,
      columnDefinitions.MATCHED_SAMPLE_ALIAS,
      columnDefinitions.MATCHING_SITE_RATIO,
      columnDefinitions.COMPARED_SITES
  ]
}

export const CONTAMINATION_TABLE_COLUMNS = (biosamplesById): { [key in IdentityContaminationColumnID]: any } => ({
  [IdentityContaminationColumnID.READSET_ID]: {
		columnID: IdentityContaminationColumnID.READSET_ID,
		title: 'Readset ID',
		dataIndex: 'readset_id',
    key: 'readset_id',
		width: '10vw',
	},
  [IdentityContaminationColumnID.TESTED_SAMPLE_ALIAS]: {
		columnID: IdentityContaminationColumnID.TESTED_SAMPLE_ALIAS,
		title: 'Tested Sample',
		dataIndex: 'tested_biosample_id',
    key: 'tested_biosample_id',
    render: (tested_biosample_id) => biosamplesById[tested_biosample_id] ? biosamplesById[tested_biosample_id].alias : "Unknown",
		width: '25vw',
	},
  [IdentityContaminationColumnID.MATCHED_SAMPLE_ALIAS]: {
		columnID: IdentityContaminationColumnID.MATCHED_SAMPLE_ALIAS,
		title: 'Matched Sample',
		dataIndex: 'matched_biosample_id',
    key: 'matched_biosample_id',
    render: (matched_biosample_id) => biosamplesById[matched_biosample_id] ? biosamplesById[matched_biosample_id].alias : "Unknown",
		width: '25vw',
	},
  [IdentityContaminationColumnID.MATCHING_SITE_RATIO]: {
		columnID: IdentityContaminationColumnID.MATCHING_SITE_RATIO,
		title: 'Matching Ratio',
		dataIndex: 'matching_site_ratio',
    key: 'matching_site_ratio',
		width: '10vw',
	},
  [IdentityContaminationColumnID.COMPARED_SITES]: {
		columnID: IdentityContaminationColumnID.COMPARED_SITES,
		title: 'Compared Sites',
		dataIndex: 'compared_sites',
    key: 'compared_sites',
		width: '10vw',
	}
})

export function IdentityWarningsButton({mixupAndContaminationWarnings}: MixupAndContaminationWarnings){
  const [WarningModalVisible, setWarningModalVisible] = useState<boolean>(false)
  const dispatch = useAppDispatch()
  const biosamplesById = useAppSelector(selectBiosamplesByID)

  useMemo(() => {
    console.log(mixupAndContaminationWarnings && mixupAndContaminationWarnings.biosample_ids)
    mixupAndContaminationWarnings && mixupAndContaminationWarnings.hasWarnings() && mixupAndContaminationWarnings.fetchBiosamples(dispatch)
  }, [dispatch, mixupAndContaminationWarnings])

  if (!mixupAndContaminationWarnings)
    return
  
  const concordanceColumns = getColumnsForConcordance(biosamplesById)
  const contaminationColumns = getColumnsForContamination(biosamplesById)
  const paginationConcordance = mixupAndContaminationWarnings.concordance_warnings.length > 10 ? {pageSize: 10} : false
  const paginationContamination = mixupAndContaminationWarnings.contamination_warnings.length > 10 ? {pageSize: 10} : false
  
  return (mixupAndContaminationWarnings && mixupAndContaminationWarnings.hasWarnings() && 
      <>
        <Button color='danger' variant='outlined' onClick={()=>setWarningModalVisible(true)}>
          <WarningTwoTone twoToneColor={'red'}/> Mixup & Contamination warnings...
        </Button>
        <Modal 
          title={"Mixup & Contamination warnings"} 
          open={WarningModalVisible} 
          width={'60vw'}
          footer={null} 
          onCancel={()=>setWarningModalVisible(false)}
        >
          { mixupAndContaminationWarnings.concordance_warnings.length > 0 &&
          <Card title={<Typography.Title level={4}>{CONCORDANCE_WARNING_MESSAGE}</Typography.Title>}>
            <Table dataSource={mixupAndContaminationWarnings.concordance_warnings} columns={concordanceColumns} pagination={paginationConcordance} size='small'/>
          </Card>
          }
          <Divider />
          { mixupAndContaminationWarnings.contamination_warnings.length > 0 &&
          <Card title={<Typography.Title level={4}>{CONTAMINATION_WARNING_MESSAGE}</Typography.Title>}>
            <Table dataSource={mixupAndContaminationWarnings.contamination_warnings} columns={contaminationColumns} pagination={paginationContamination} size='small'/>
          </Card>
          }
        </Modal>
      </>
      
  )
}