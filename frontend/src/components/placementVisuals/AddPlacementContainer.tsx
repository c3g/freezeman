import React, { useCallback, useState } from "react"
import { Button, Select, Tabs, Typography } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { selectCoordinatesByID } from "../../selectors"
import { PLACED_STRING } from "./PlacementTab"
import { copyKeyObject } from "./Placement"
import Modal from "antd/lib/modal/Modal"
import SearchContainer from "../SearchContainer"
import Input from "antd/lib/input/Input"
import api from "../../utils/api"
const { Text } = Typography;
interface AddPlacementContainerProps {
    addDestination: (destinationContainer) => void
}
//component used to handle the creation of a new destination container
const AddPlacementContainer = ({ addDestination }: AddPlacementContainerProps) => {
    const [isPopup, setIsPopup] = useState<boolean>(false)
    //used to hold new container data
    const [newContainer, setNewContainer] = useState<any>({
        barcode: '', samples: '', container_kind: ''
    })
    //used to hold loaded container data
    const [loadedContainer, setLoadedContainer] = useState<any>({})
    const [selectedTab, setSelectedTab] = useState<string>('new')
    const coordinates = useAppSelector(selectCoordinatesByID)

    const dispatch = useAppDispatch()
    //retrieves container on search
    const handleContainerLoad = useCallback(async (loadedContainer) => {
        const container = await dispatch(api.containers.get(loadedContainer))
        const loadedSamples = await dispatch(api.samples.list({ id__in: container.data.samples.join(',') }))
        const containerName = container.data.name

        const newDestination = {}
        loadedSamples.data.results.forEach(sample => {
            newDestination[sample.id] = { id: sample.id, coordinates: (coordinates[sample.coordinate].name), type: PLACED_STRING, name: sample.name, sourceContainer: containerName }
        })
        setLoadedContainer({ container_name: containerName, samples: copyKeyObject(newDestination) })
    }, [coordinates])

    //calls addDestination prop with 'New Destination' container
    const handleConfirm = useCallback(() => {
        const container = selectedTab == 'load' ? loadedContainer : newContainer
        addDestination(container)
        setIsPopup(false)
    }, [newContainer, loadedContainer])

    //handles input change, NOTE: didn't want to use a form since there were only two fields
    const handleInputChange = useCallback((e, inputName) => {
        const tempContainer = newContainer
        const value = e.target ? e.target.value : e
        switch (inputName) {
            case 'barcode':
                tempContainer.container_name = value
                break
            case 'container_kind':
                tempContainer.container_kind = value
                break
            default:
                break;
        }
        setNewContainer({ ...tempContainer })
    }, [newContainer])
    return (
        <>
            <Button onClick={() => setIsPopup(true)}>Add Destination</Button>
            <Modal title="Add Destination" visible={isPopup} onOk={handleConfirm} onCancel={() => setIsPopup(false)}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>

                    <Tabs defaultActiveKey={'New'} activeKey={selectedTab} onTabClick={(e) => setSelectedTab(e)}>
                        <Tabs.TabPane tab='New Container' key={'new'}>
                            <Input onChange={(e) => handleInputChange(e, 'barcode')} placeholder="Barcode"></Input>
                            <Select onChange={(e) => handleInputChange(e, 'container_kind')} placeholder="Container kind" style={{ width: "100%" }} options={[{ value: '96-well plate', label: '96-well plate' },]}></Select>
                        </Tabs.TabPane>
                        
                        <Tabs.TabPane tab='Load Container' key={'load'}>
                            <SearchContainer handleOnChange={(value) => handleContainerLoad(value)} />
                        </Tabs.TabPane>
                    </Tabs>

                </div>
            </Modal>
        </>
    )
}
export default AddPlacementContainer