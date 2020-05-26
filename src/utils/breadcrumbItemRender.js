import React from "react";
import {Link} from "react-router-dom";

function itemRender(route, params, routes, paths) {
  const last = routes.indexOf(route) === routes.length - 1;
  return last ? (
    <span>{route.breadcrumbName}</span>
  ) : (
    <Link to={'/' + paths.join('/')}>{route.breadcrumbName}</Link>
  );
}

export default itemRender
