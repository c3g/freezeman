export default function stripHTMLTags(s) {
  return s.toString().replace(/<[^>]*>/g, '');
}
