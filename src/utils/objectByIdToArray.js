import weakMapMemoize from "./weak-map-memoize";

const objectByIdToArray =
  weakMapMemoize(itemsByID => Object.values(itemsByID))

export default objectByIdToArray;
