
/**
 * Returns a memoized fn.
 * For @config: Object arguments will need to use a WeakMap, and primitive
 * types will use a Map.
 * @param {Function} fn - The function to memoize
 * @param {(WeakMap|Map)[]} config - The map type to use for each argument of fn
 * @example
 *   const fn = (item, y) => item.value + y;
 *
 *   const mFn = weakMapMemoize(fn, [
 *     WeakMap, // item is an object, WeakMap is necessary
 *     Map,     // y is an number, Map is necessary
 *   ])
 * @returns {Function}
 */
function weakMapMemoize(fn, config = []) {
  let length = Math.max(fn.length, config.length);

  const baseMap = createMap(config[0]);

  return (...args) => {

    let currentMap = baseMap;

    for (let i = 0; i < length - 1; i++) {

      if (!currentMap.has(args[i]))
        currentMap.set(args[i], createMap(config[i + 1]));

      currentMap = currentMap.get(args[i]);
    }

    const lastArg = args[args.length - 1];

    if (currentMap.has(lastArg))
      return currentMap.get(lastArg);

    const result = fn(...args);

    currentMap.set(lastArg, result);

    return result;
  }
}

function createMap(type) {
  return type === undefined ? new WeakMap() : new type();
}


export default weakMapMemoize;
