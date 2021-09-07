export default function filterProjectsBySample(setFilter, filters, sampleName, clearFilters) {
  if (!sampleName)
    return

  if("samples" in filters) {
    if (filters["samples"]["value"] !== sampleName){
      clearFilters()
      setFilter("samples", sampleName)
    }
  }
  else
    setFilter("samples", sampleName)
}
