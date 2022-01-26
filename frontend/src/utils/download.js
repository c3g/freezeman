/*
 * download.js
 */


export function downloadFromFile(filename, fileData) {

  const processFile = () => {
    filename = fileData.filename ? fileData.filename.replace(/^.*[\\\/]/, '') : filename
    return fileData.data ? fileData.data : fileData
  }

  const data = processFile()
  const fileBlob = new Blob([data], { type: 'application/octet-binary' })
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
