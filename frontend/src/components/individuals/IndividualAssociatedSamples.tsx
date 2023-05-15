import React, { useEffect, useState } from "react"
import { listByIndividual } from "../../modules/samples/actions";
const IndividualAssociatedSamples = () => {
    const [samplesData, setSamplesState] = useState([]);
    useEffect(() => {
        const samples = listByIndividual(1);
        setSamplesState(samples)
    }, [])
    return <>
        {
            samplesData.forEach()
        }
    </>
}

export default IndividualAssociatedSamples