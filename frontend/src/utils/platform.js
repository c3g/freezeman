/*
 * platform.js
 *
 * Watches & returns information about the current platform
 */

import bowser from "bowser"

export const OS = {
  WINDOWS: 'windows',
  MACOS:   'macos',
  LINUX:   'linux',
  ANDROID: 'android',
  IOS:     'ios',
}

export const TYPE = {
  MOBILE:  'mobile',
  DESKTOP: 'desktop',
  TABLET:  'tablet',
}

let current
let lastUA

/* Initialize */
platform()

export default function platform() {
  if (navigator.userAgent === lastUA) {
    return current
  }
  lastUA = navigator.userAgent

  const data = bowser.parse(navigator.userAgent)

  const os   = data.os.name.toLowerCase() // windows, macos, linux, android, (ios?)
  const type = data.platform.type.toLowerCase() // mobile, desktop, tablet

  const isDeviceTouch = type === 'mobile' || type === 'tablet'

  const supportsPointer =
    window.matchMedia('(pointer: fine)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  const isPointerCoarse = window.matchMedia('(pointer: coarse)')

  current = {
    os,
    type,
    isTouch: supportsPointer ? isPointerCoarse : isDeviceTouch,
  }

  document.body.classList.forEach(c => {
    if (c.startsWith('platform-'))
      document.body.classList.remove(c)
  })

  document.body.classList.add(`platform-${platform.os}`)
  document.body.classList.add(`platform-${platform.type}`)
  if (current.isTouch)
    document.body.classList.add(`platform-isTouch`)

  return current
}

