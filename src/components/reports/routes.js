
const routes = [
  {
    path: '/',
    breadcrumbName: 'Home',
  },
  {
    path: '/reports',
    breadcrumbName: 'Reports',
    children: [
      {
        path: '/sample',
        breadcrumbName: 'Sample',
      },
      {
        path: '/user',
        breadcrumbName: 'User',
      },
    ],
  },
];

export default routes;
