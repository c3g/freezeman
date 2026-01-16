import React, { useState, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { Button, Col, Row, Space, Spin, Typography } from 'antd'
import { CheckOutlined, CloseOutlined, RightOutlined, WarningOutlined } from "@ant-design/icons"

import { PERMISSIONS, hasPermission } from '../../permissions'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { LAUNCH_STATUS } from "../../modules/experimentRuns/reducers"
import {launchExperimentRun, relaunchExperimentRun, flushExperimentRunLaunch} from "../../modules/experimentRuns/actions"
import dayjs from 'dayjs'

const { Text } = Typography

const ExperimentRunLaunchCard = ({experimentRun, experimentRunLaunch}) => {
    /*
      Cases:
        - run has never been launched
        - run was launched in the past
        - run is being launched
        - run was launched successfully
        - run launch failed with error
    */
  
    const dispatch = useDispatch()
    const currentUser = useCurrentUser()
    const isUserStaff = currentUser?.is_staff ?? false
    const hasLaunchPermission = hasPermission(currentUser, PERMISSIONS.LAUNCH_EXPERIMENT_RUN)
    const hasRelaunchPermission = hasPermission(currentUser, PERMISSIONS.RELAUNCH_EXPERIMENT_RUN)

    // Controls whether launch button and launch state is displayed
    const [panelIsOpen, setPanelIsOpen] = useState(!!experimentRunLaunch)

    const openLaunchPanel = () => {
      setPanelIsOpen(true)
    }

    const closeLaunchPanel = () => {
      setPanelIsOpen(false)
      if (experimentRunLaunch) {
        flushLaunch()
      }
    }

    // Launch the run
    const launchRunProcessing = () => {
      dispatch(launchExperimentRun(experimentRun.id))
    }

    // Relaunch the run
    const relaunchRunProcessing = () => {
      dispatch(relaunchExperimentRun(experimentRun.id))
    }
  
    // Flushes the experiment run launch info from redux
    const flushLaunch = () => {
      dispatch(flushExperimentRunLaunch(experimentRun.id))
    }

    function getLaunchPanelContents() {
      if (experimentRunLaunch) {
        // If a run was launched, show its current state.
        switch(experimentRunLaunch.status) {
          case LAUNCH_STATUS.LAUNCHING: {
            return (
              <Space>
                <Spin/>
                <Text>Launching</Text>
              </Space>
            )
          }
          case LAUNCH_STATUS.LAUNCHED: {
            return (
              <Space>
                <CheckOutlined/><Text type='success'>Success</Text>
              </Space>
            )
          }
          case LAUNCH_STATUS.ERROR: {
            return (
              <Space>
                <WarningOutlined/><Text type='danger'>Launch Failed</Text>
              </Space>
            )
          }
        }
      } else {
        // Show the button to launch or relaunch run processing.
        const isFirstLaunch = !experimentRun.run_processing_launch_time

        const launchButton = <Button type="primary" onClick={launchRunProcessing} disabled={!hasLaunchPermission & !isUserStaff}>Launch Run</Button>
        const relaunchButton = <Button style={{background: 'orange'}} onClick={relaunchRunProcessing} disabled={!hasRelaunchPermission & !isUserStaff}>Relaunch Run</Button>

        return (
          <Space align='end'>
            {isFirstLaunch ? launchButton : relaunchButton}
          </Space>
        )
      }
    }

    function getContents() {
      if (panelIsOpen) {
        return getLaunchPanelContents()
      } else {
        const launchDate = experimentRun.run_processing_launch_time ?
          dayjs(experimentRun.run_processing_launch_time).format("YYYY-MM-DD")
          : 'Not launched'
        return (
          <Text>{launchDate}</Text>
        )
      }
    }
    
    // The '>' and 'X' buttons used to open and close the launch panel
    const openButton = <Button type='default' shape="circle" icon={<RightOutlined/> } onClick={openLaunchPanel}/>
    const closeButton = <Button type='default' shape="circle" icon={<CloseOutlined/>} onClick={closeLaunchPanel}/>

    return (
        <Row align='middle' justify='center' wrap={false} style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
          <Col flex="auto" style={{textAlign: 'center'}}>{getContents()}</Col>
          <Col span="32px">{panelIsOpen ? closeButton : openButton}</Col>  
        </Row>
    )
    
  }

  export default ExperimentRunLaunchCard
  