import type { ThemeConfig } from "antd"

export const SOIL = "#3b2a1a"
export const SOIL_LIGHT = "#5a4027"
export const POTATO_SKIN = "#a0703c"
export const POTATO_FLESH = "#fbf3dc"
export const POTATO_FLESH_HOVER = "#f4e8c3"
export const LEAF_GREEN = "#5b8c2a"
export const STRAW = "#e8d9a8"

export const POTATO_EMOJI_URL = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f954.png"
export const POTATO_PILE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Potato_tubers.jpg/330px-Potato_tubers.jpg"
export const POTATO_PAIL_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Potato_tubers_in_pail.jpg/330px-Potato_tubers_in_pail.jpg"

export const potatoTheme: ThemeConfig = {
  token: {
    colorPrimary: POTATO_SKIN,
    colorLink: POTATO_SKIN,
    colorSuccess: LEAF_GREEN,
    colorBgLayout: POTATO_FLESH,
    colorBorder: STRAW,
    borderRadius: 10,
  },
  components: {
    Layout: {
      siderBg: SOIL,
      triggerBg: SOIL,
      bodyBg: POTATO_FLESH,
    },
    Menu: {
      darkItemBg: SOIL,
      darkSubMenuItemBg: SOIL,
      darkItemSelectedBg: SOIL_LIGHT,
    },
    Table: {
      headerBg: STRAW,
      rowHoverBg: POTATO_FLESH_HOVER,
    },
    Card: {
      headerBg: STRAW,
    },
  },
}
