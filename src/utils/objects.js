export const objectsByProperty = (objs, prop="id") => Object.fromEntries(objs.map(o => [o[prop], o]));
