export default function relativeLin(url: string) {
  return new URL(url).pathname;
}
