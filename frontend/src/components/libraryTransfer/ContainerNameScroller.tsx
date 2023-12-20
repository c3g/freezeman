import { Input, Button, Typography } from "antd"
import React from "react"
const { Text } = Typography;

interface ContainerNameScrollerProps {
    changeContainer: (number: string, name: string, type: string) => void,
    name: string,
    changeContainerName?: (containerName) => void,
    type: string,
    disabled: boolean
}

const ContainerNameScroller = ({ name, changeContainer, changeContainerName, type, disabled}: ContainerNameScrollerProps) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            <Button disabled={disabled} onClick={() => changeContainer('-1', name, type)}>
                Previous
            </Button>
            {
                changeContainerName ?

                    <Input value={name} style={{ width: '50%', textAlign: 'center' }} onChange={changeContainerName} />
                    :
                    <Text> {name}</Text>
            }
            <Button disabled={disabled} onClick={() => changeContainer('1', name, type)}>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller