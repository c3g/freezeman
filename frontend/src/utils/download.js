/*
 * download.js
 */

export function downloadFromFile(filename, fileData) {
  const fileBlob = new Blob([fileData], { type: 'application/octet-binary' })
  const url = URL.createObjectURL(fileBlob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)

  if (document.createEvent) {
    const event = document.createEvent('MouseEvents')
    event.initEvent('click', true, true)
    link.dispatchEvent(event)
  } else {
    link.click()
  }

  // Deallocate resources
  if (URL.revokeObjectURL)
    URL.revokeObjectURL(url)
}
