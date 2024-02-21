import React, { useCallback, useState } from "react"
import { Alert, Button, Form, Select, Tabs, notification } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { selectCoordinatesByID } from "../../selectors"
import { PLACED_STRING, containerSample } from "./PlacementTab"
import Modal from "antd/lib/modal/Modal"
import SearchContainer from "../SearchContainer"
import Input from "antd/lib/input/Input"
import api from "../../utils/api"

interface AddPlacementContainerProps {
    onConfirm: (destinationContainer) => void
    destinationContainerList: containerSample[]
    setDestinationIndex: (number: number) => void
}

//component used to handle the creation of a new destination container
const AddPlacementContainer = ({ onConfirm, destinationContainerList, setDestinationIndex }: AddPlacementContainerProps) => {
    const [isPopup, setIsPopup] = useState<boolean>(false)

    //used to hold loaded container data
    const [loadedContainer, setLoadedContainer] = useState<any>({})
    const [selectedTab, setSelectedTab] = useState<string>('new')
    const [error, setError] = useState<string | undefined>(undefined)
    const [newContainer, setNewContainer] = useState<any>({})

    const coordinates = useAppSelector(selectCoordinatesByID)

    const dispatch = useAppDispatch()
    //retrieves container on search
    const handleContainerLoad = useCallback(async (loadedContainer) => {
        const container = await dispatch(api.containers.get(loadedContainer))
        const containerName = container.data.name
        const newDestination = {}
        if (container.data.samples.length > 0) {
            const loadedSamples = await dispatch(api.samples.list({ id__in: container.data.samples.join(',') }))

            loadedSamples.data.results.forEach(sample => {
                    newDestination[sample.id] = { id: sample.id, coordinates: (sample.coordinate && coordinates[sample.coordinate].name), type: PLACED_STRING, name: sample.name, sourceContainer: containerName }
            })
        }
        setLoadedContainer({ container_name: containerName, container_kind: container.data.kind, samples: { ...newDestination }, })
    }, [coordinates])

    //calls addDestination prop with 'New Destination' container
    const handleConfirm = useCallback(() => {
        const container = selectedTab == 'load' ? loadedContainer : newContainer
        if (container.container_name && container.container_kind && container.container_kind != 'tube') {
            onConfirm(container)
            setIsPopup(false)
            setNewContainer({})
            setDestinationIndex(destinationContainerList.length)
        } else {
            setError("Invalid container kind")
            const INVALID_KIND_NOTIFICATION_KEY = `LabworkStep.placement-invalid-container-kind`
            notification.error({
              message: `Invalid destination container kind.`,
              key: INVALID_KIND_NOTIFICATION_KEY,
              duration: 20
            })
        }
    }, [loadedContainer, selectedTab, newContainer, destinationContainerList])

    const handleOnChange = useCallback((e, name) => {
        const container = { ...newContainer }
        container[name] = e.target ? e.target.value : e
        setNewContainer(container)
    }, [newContainer])


    return (
        <>
            <Button onClick={() => setIsPopup(true)}>Add Destination</Button>
            <Modal title="Add Destination" open={isPopup} onOk={handleConfirm} onCancel={() => setIsPopup(false)}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Tabs defaultActiveKey={'New'} activeKey={selectedTab} onTabClick={(e) => setSelectedTab(e)}>
                        <Tabs.TabPane tab='New Container' key={'new'}>
                            <Input value={newContainer.container_name} placeholder="Barcode" onChange={(e) => handleOnChange(e, 'container_name')}></Input>
                            <Select value={newContainer.container_kind} clearIcon placeholder="Container kind" onChange={(e) => handleOnChange(e, 'container_kind')} style={{ width: "100%" }} options={[{ value: '96-well plate', label: '96-well plate' }]}></Select>
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