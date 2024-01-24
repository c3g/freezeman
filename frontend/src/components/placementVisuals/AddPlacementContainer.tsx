import React, { useCallback, useState } from "react"
import { Alert, Button, Form, Select, Tabs } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { selectCoordinatesByID } from "../../selectors"
import { PLACED_STRING } from "./PlacementTab"
import { copyKeyObject } from "./Placement"
import Modal from "antd/lib/modal/Modal"
import SearchContainer from "../SearchContainer"
import Input from "antd/lib/input/Input"
import api from "../../utils/api"

interface AddPlacementContainerProps {
    addDestination: (destinationContainer) => void
}

//component used to handle the creation of a new destination container
const AddPlacementContainer = ({ addDestination }: AddPlacementContainerProps) => {
    const [isPopup, setIsPopup] = useState<boolean>(false)

    //used to hold loaded container data
    const [loadedContainer, setLoadedContainer] = useState<any>({})
    const [selectedTab, setSelectedTab] = useState<string>('new')
    const [error, setError] = useState<string | undefined>(undefined)
    const [form] = Form.useForm()

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
        setLoadedContainer({ container_name: containerName, container_kind: container.data.kind, samples: copyKeyObject(newDestination), })
    }, [coordinates])

    //calls addDestination prop with 'New Destination' container
    const handleConfirm = useCallback(() => {
        const container = selectedTab == 'load' ? loadedContainer : { ...form.getFieldsValue(), samples: { 6: {id: 6}} }
        if (container.container_name && container.container_kind && container.container_kind != 'tube') {
            addDestination(container)
            setIsPopup(false)
            form.resetFields()
        } else {
            setError("Invalid container kind")
        }
    }, [loadedContainer, selectedTab])


    return (
        <>
            <Button onClick={() => setIsPopup(true)}>Add Destination</Button>
            <Modal title="Add Destination" visible={isPopup} onOk={handleConfirm} onCancel={() => setIsPopup(false)}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {error ?
                        <Alert
                            type='error'
                            message='Destination Error'
                            description={error}
                            closable={true}
                            showIcon={true}
                            onClose={() => { setError(undefined) }}
                        />
                        : ''}
                    <Tabs defaultActiveKey={'New'} activeKey={selectedTab} onTabClick={(e) => setSelectedTab(e)}>
                        <Tabs.TabPane tab='New Container' key={'new'}>
                            <Form
                                form={form}
                                layout="horizontal">
                                <Form.Item name={"container_name"}>
                                    <Input placeholder="Barcode"></Input>
                                </Form.Item>
                                <Form.Item name={"container_kind"}>
                                    <Select placeholder="Container kind" style={{ width: "100%" }} options={[{ value: '96-well plate', label: '96-well plate' }]}></Select>
                                </Form.Item>
                            </Form>
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