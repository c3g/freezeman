import { Button, Select, Switch, Typography } from "antd"
import Modal from "antd/lib/modal/Modal"
import React, { useCallback, useState } from "react"
import SearchContainer from "../SearchContainer"
import Input from "antd/lib/input/Input"
import { useAppDispatch, useAppSelector } from "../../hooks"
import api from "../../utils/api"
import { selectCoordinatesByID } from "../../selectors"
import { NONE_STRING } from "./PlacementTab"
import { copyKeyObject } from "./Placement"
const { Text } = Typography;
interface AddPlacementContainerProps {
    addDestination: (destinationContainer) => void
}
const AddPlacementContainer = ({ addDestination }: AddPlacementContainerProps) => {
    const [loadPopUp, setLoadPopUp] = useState<boolean>(false)
    const [loadedContainer, setLoadedContainer] = useState<any>({})
    const [isLoad, setIsLoad] = useState<boolean>(false)
    const coordinates = useAppSelector(selectCoordinatesByID)

    const dispatch = useAppDispatch()
    const handleContainerLoad = useCallback(async () => {
        let container = await dispatch(api.containers.get(loadedContainer))
        container = container.data.name
        const newDestination = {}
        const loadedSamples = await dispatch(api.samples.list({ id__in: container.data.samples.join(',') }))
        const parseCoordinate = (value) => {
            return value.substring(0, 1) + "_" + (parseFloat(value.substring(1)));
        }
        loadedSamples.data.results.forEach(sample => {
            newDestination[sample.id] = { coordinates: parseCoordinate(coordinates[sample.coordinate].name), type: NONE_STRING, name: sample.name, sourceContainer: container }
        })

        addDestination({ container_name: container, samples: copyKeyObject(newDestination) })
        setLoadPopUp(false)
    }, [loadedContainer, coordinates])
    return (
        <>
            <Button onClick={() => setLoadPopUp(true)}>Add Destination</Button>

            <Modal title="Add Destination" visible={loadPopUp} onOk={handleContainerLoad} onCancel={() => setLoadPopUp(false)}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div>
                        <Text>  </Text>
                        <Switch checkedChildren="Toggle New" unCheckedChildren="Toggle Load" checked={isLoad} onChange={() => setIsLoad(!isLoad)}></Switch>
                    </div>
                    {
                        !isLoad
                            ?
                            <>
                                <Text> New Container </Text>
                                <Input placeholder="Destination Barcode"></Input>
                                <Select placeholder="Container kind" style={{ width: "100%" }} onChange={() => { }} options={[{ value: '96-well plate', label: '96-well plate' },]}></Select>
                            </>
                            :
                            <>
                                <Text> Load Container </Text>
                                <SearchContainer handleOnChange={(value) => setLoadedContainer(value)} />
                            </>
                    }
                </div>
            </Modal>
        </>
    )
}
export default AddPlacementContainer