
function weakMapMemoize(...args) {
  let fn     = args.length === 2 ? args[1] : args[0]
  let config = args.length === 2 ? args[0] : []
  let length = Math.max(fn.length, config.length)

  const baseMap = createMap(config[0])

  return (...args) => {

    let currentMap = baseMap

    for (let i = 0; i < length - 1; i++) {

      if (!currentMap.has(args[i]))
        currentMap.set(args[i], createMap(config[i + 1]))

      currentMap = currentMap.get(args[i])
    }

    const lastArg = args[args.length - 1]

    if (currentMap.has(lastArg))
      return currentMap.get(lastArg)

    const result = fn(...args)

    currentMap.set(lastArg, result)

    return result
  }
}

function createMap(type) {
  return type === undefined ? new WeakMap() : new type()
}


export default weakMapMemoize
