export default function relativeLink(url: string) {
  return new URL(url).pathname;
}
