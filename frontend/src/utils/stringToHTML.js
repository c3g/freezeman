export default function stringToHTML(str) {
  const div = document.createElement("div");
  div.innerHTML = str;
  return div.innerText;
}
