import React, { useState } from 'react'
import { Button, Table, Typography,  Modal } from 'antd'
import { WarningTwoTone } from "@ant-design/icons"

import { FMSId } from '../../models/fms_api_models'

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
  constructor(readset_id, tested_biosample_id, matched_biosample_id){
    this.readset_id = readset_id
    this.tested_biosample_id = tested_biosample_id
    this.matched_biosample_id = matched_biosample_id
  }
}

export class MixupAndContaminationWarnings {
	concordance_warnings: ConcordanceWarningValues[]
	contamination_warnings: ContaminationWarningValues[]
  constructor(){
    this.concordance_warnings = []
    this.contamination_warnings = []
  }
  addConcordanceWarning(warning: ConcordanceWarningValues){
    this.concordance_warnings.length > 0 ? this.concordance_warnings = this.concordance_warnings.concat([warning]) : this.concordance_warnings = [warning]
  }
  addContaminationWarning(warning: ContaminationWarningValues){
    this.contamination_warnings.length > 0 ? this.contamination_warnings = this.contamination_warnings.concat([warning]) : this.contamination_warnings = [warning]
  }
}

export enum IdentityConcordanceColumnID {
	READSET_ID  = 'READSET_ID',
  BIOSAMPLE_ID = "BIOSAMPLE_ID"
}

const CONCORDANCE_TABLE_COLUMNS = [
  {
		columnID: IdentityConcordanceColumnID.READSET_ID,
		title: 'Readset ID',
		dataIndex: ['warning', 'readset_id'],
		render: (_, warning) => warning.readset_id,
		width: 90,
	},
  {
		columnID: IdentityConcordanceColumnID.BIOSAMPLE_ID,
		title: 'Biosample ID',
		dataIndex: ['warning', 'biosample_id'],
		render: (warning) => warning.biosample_id,
		width: 90,
	},
]

export enum IdentityContaminationColumnID {
	READSET_ID  = 'READSET_ID',
  TESTED_BIOSAMPLE_ID = "TESTED_BIOSAMPLE_ID",
  MATCHED_BIOSAMPLE_ID = "MATCHED_BIOSAMPLE_ID"
}


export function IdentityWarningsButton(mixupAndContaminationWarnings: MixupAndContaminationWarnings){
  const [WarningModalVisible, setWarningModalVisible] = useState<boolean>(false)
  return (mixupAndContaminationWarnings &&
      <>
        <Button color='danger' variant='outlined' onClick={()=>setWarningModalVisible(true)}>
          <WarningTwoTone twoToneColor={'red'}/> Mixup & Contamination warnings...
        </Button>
        <Modal title={"Mixup & Contamination warnings"} open={WarningModalVisible} footer={null} onCancel={()=>setWarningModalVisible(false)} width={'45rem'}>
            <Typography.Paragraph>
                Validation of the sequencing data against the sample identity have raised some warnings.
            </Typography.Paragraph>
            <Table dataSource={mixupAndContaminationWarnings.concordance_warnings} columns={CONCORDANCE_TABLE_COLUMNS} />
        </Modal>
      </>
      
  )
}