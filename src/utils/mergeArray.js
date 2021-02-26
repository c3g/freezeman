
export default function mergeArray(array, offset, newArray) {

    let items = array.slice(0);

    if (offset > items.length) {
        const diff = offset - items.length;
        items = items.concat(Array.from({ length: diff }, () => null));
        items.splice(offset, 0, ...newArray);
    }
    else {
        items.splice(offset, newArray.length, ...newArray);
    }

    return items;
}
