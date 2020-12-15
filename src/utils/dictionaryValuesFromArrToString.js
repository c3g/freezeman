
export default function dictionaryValuesFromArrToString(originalDictionary) {
  let dictionary = {}
  for (const [key, value] of Object.entries(originalDictionary)) {
    dictionary[key] = [].concat(value).join(",")
  }
  return dictionary;
}