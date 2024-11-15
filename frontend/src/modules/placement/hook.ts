import { useAppSelector } from "../../hooks";
import { getRealParentContainer, reducePlacementSamplesWithParent, reduceSampleDetails } from "./helpers";
import { PlacementCoordinates, RealParentContainerState } from "./models";
import { selectPlacementState } from "./selectors";

export function useIsPlacementContainerFilled(container: RealParentContainerState['name']) {
    const placementState = useAppSelector(selectPlacementState)
    const containerState = getRealParentContainer(placementState, { parentContainer: container })

    const [rowAxis = [] as const, colAxis = [] as const] = containerState.spec
    const totalCells = rowAxis.length * colAxis.length

    const coordinatesCovered = new Set<PlacementCoordinates>()
    const placementCounts =
        reducePlacementSamplesWithParent(placementState, { parentContainer: container }, (acc, sample) => {
            if (!coordinatesCovered.has(sample.coordinates)) {
                acc += 1
                coordinatesCovered.add(sample.coordinates)
            }
            return acc
        }, 0)
        +
        reduceSampleDetails(placementState, (acc, sample) => {
            if (sample.parentContainer === container && !coordinatesCovered.has(sample.coordinates) && sample.totalPlacementAmount === 0) {
                // sample.totalPlacementAmount === 0 means the sample is not placed
                acc += 1
                coordinatesCovered.add(sample.coordinates)
            }
            return acc
        }, 0)

    return placementCounts === totalCells
}