import React from "react";
import { Link } from "react-router-dom";
import { Menu } from "antd";

// renderMenuItem and matchingMenuKeys taken from chord_web

// Custom menu renderer
export const renderMenuItem = i => {
  if (i["children"]) {
    return (
      <Menu.SubMenu style={i.style || {}} title={
        <span className="submenu-title-wrapper">
          {i.url ?
            <Link to={i.url}>
              {i.icon || null}
              <span className="freezeman-menu-text">{i.text || null}</span>
            </Link> : <span>
              {i.icon || null}
              <span className="freezeman-menu-text">{i.text || null}</span>
            </span>}
        </span>
      } key={i.key || ""}>
        {(i.children).map(ii => renderMenuItem(ii))}
      </Menu.SubMenu>
    );
  }

  return <Menu.Item key={i.key || i.url || ""}
    onClick={i.onClick || undefined}
    style={i.style || {}}
    disabled={i.disabled || false}>
    {i.url && !i.onClick ?
      <Link to={i.url}>
        {i.icon || null}
        <span className="freezeman-menu-text">{i.text || null}</span>
      </Link> : <span>
        {i.icon || null}
        <span className="freezeman-menu-text">{i.text || null}</span>
      </span>}
  </Menu.Item>;
};

export const matchingMenuKeys = menuItems => menuItems
  .filter(i => (i.url && window.location.pathname.startsWith(i.url)) || (i.children || []).length > 0)
  .flatMap(i => [i.key || i.url || "", ...matchingMenuKeys(i.children || [])]);
