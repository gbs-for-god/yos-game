/** falsy 값을 걸러내고 className을 합친다. (외부 의존성 없이 사용하는 최소 구현) */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
