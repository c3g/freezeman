
export default function filterDictionaryByKeys(dict, keys){
  const keysList = [].concat(keys)
  return Object.fromEntries(Object.entries(dict).filter(([k,v]) => keysList.includes(k)));
}