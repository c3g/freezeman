import React from "react";
import { Link } from "react-router-dom";

/**
 * @typedef {Required<import("antd").MenuProps>['items'][number]} MenuItem
 * @typedef {Partial<{
	* key: string,
	* icon: JSX.Element,
	* text: string,
	* url?: string,
	* onClick: () => void,
	* children: BadMenuItem[],
	* style: React.CSSProperties,
	* disabled?: boolean
 * }>} BadMenuItem
 */

/**
 * @param {BadMenuItem} menuItem
 * @returns {Pick<MenuItem, "key" | "label" | "onClick" | "children">}
 */
export function resolveBadMenuItem(menuItem) {
	return {
		key: menuItem.key || menuItem.url || "",
		onClick: menuItem.onClick,
		style: menuItem.style,
		disabled: menuItem.disabled ?? false,
		label: menuItem.url && !menuItem.onClick ? (
			<Link to={menuItem.url}>
				{menuItem.icon || null}
				<span className="freezeman-menu-text">{menuItem.text || null}</span>
			</Link>
		) : (
			<span>
				{menuItem.icon || null}
				<span className="freezeman-menu-text">{menuItem.text || null}</span>
			</span>
		),
		children: menuItem.children ? menuItem.children.map(resolveBadMenuItem) : undefined,
	}
}


/**
* @param {BadMenuItem[]} menuItems
* @returns {string[]}
 */
export function matchingMenuKeys(menuItems) {
	/**
	 * @type {string[]}
	 */
	const keys = []
	for (const i of menuItems) {
		if (i.url && window.location.pathname.startsWith(i.url)) {
			keys.push(i.key || i.url || "")
		}
		if (i.children) {
			keys.push(...matchingMenuKeys(i.children))
		}
	}
	return keys
}
