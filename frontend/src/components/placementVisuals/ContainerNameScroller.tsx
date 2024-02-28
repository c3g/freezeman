import { Input, Button, Tag, Typography } from "antd"
import React from "react"
const { Text, Title } = Typography;

interface ContainerNameScrollerProps {
    changeContainer: (number: string, containerType: string) => void,
    name: string,
    changeContainerName?: (container_name) => void,
    containerType: string,
    disabled: boolean
}
//component used to display the container name, and also to cycle through the container list using callbacks
const ContainerNameScroller = ({ name, changeContainer, changeContainerName, containerType, disabled}: ContainerNameScrollerProps) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            <Button disabled={disabled} onClick={() => changeContainer('-1', containerType)}>
                Previous
            </Button>
            { //if destination then an input will be displayed, else use regular text box
                changeContainerName ?

                    <Input placeholder={"Destination Barcode"} value={name} style={{ width: '50%', textAlign: 'center' }} onChange={changeContainerName} />
                    :
                    <Tag style={{ height: "32px", paddingTop: "3px", textAlign: 'center' }}><Text strong><Title level={5}>{name}</Title></Text></Tag>
            }
            <Button disabled={disabled} onClick={() => changeContainer('1', containerType)}>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller