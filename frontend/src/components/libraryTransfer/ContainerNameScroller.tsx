import { Input, Button, Typography } from "antd"
import React from "react"
const { Text } = Typography;

interface ContainerNameScrollerProps {
    changeContainer: (string: string) => void,
    name?: string,
    changeContainerName?: (containerName) => void
}

const ContainerNameScroller = ({ name, changeContainer, changeContainerName }: ContainerNameScrollerProps) => {
    console.log(name, "name")
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            <Button onClick={() => changeContainer('previous')}>
                Previous
            </Button>
            {
                changeContainerName ?

                    <Input defaultValue={name} style={{ width: '50%', textAlign: 'center' }} onChange={changeContainerName} />
                    :
                    <Text> {name}</Text>
            }
            <Button onClick={() => changeContainer('next')}>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller