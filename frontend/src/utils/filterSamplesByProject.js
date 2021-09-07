export default function filterSamplesByProject(setFilter, filters, projectName, clearFilters) {
  if (!projectName)
    return

  if("projects" in filters) {
    if (filters["projects"]["value"] !== projectName){
      clearFilters()
      setFilter("projects", projectName)
    }
  }
  else
    setFilter("projects", projectName)
}
