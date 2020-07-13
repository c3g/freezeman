import Fuse from "fuse.js";

export default function filterAutocompleteOptions(
    searchText,
    items,
    searchKeys
) {
  const options = {
    keys: searchKeys,
  };
  const fuse = new Fuse(items, options);
  return fuse.search(searchText);
};
