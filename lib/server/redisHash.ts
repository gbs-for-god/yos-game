/**
 * Redis 해시(HGETALL) 응답을 `{ 필드: 값 }` 객체로 바꾼다 (서버 전용, 의존성 없음).
 *
 * 이 프로젝트의 Redis 클라이언트는 `automaticDeserialization: false` 로 만들어지는데,
 * 이 옵션에서는 `hgetall` 이 객체가 아니라 `[필드, 값, 필드, 값, …]` 형태의 평평한 배열을 돌려준다.
 * 이를 `Object.keys()` 로 읽으면 필드 이름 대신 "0", "1" 같은 인덱스가 나오므로 반드시 이 함수를 거친다.
 * 해시가 없으면 Redis 는 null 또는 빈 배열을 돌려주며, 이미 객체인 경우(다른 클라이언트 설정)도 그대로 받아 준다.
 */
export function toHashRecord(raw: unknown): Record<string, string> {
  if (raw === null || raw === undefined) return {};

  if (Array.isArray(raw)) {
    const entries: [string, string][] = [];
    for (let i = 0; i + 1 < raw.length; i += 2) entries.push([String(raw[i]), String(raw[i + 1])]);
    // Object.fromEntries 는 "__proto__" 같은 이름도 일반 필드로 만든다
    return Object.fromEntries(entries);
  }

  if (typeof raw === "object") {
    return Object.fromEntries(Object.entries(raw).map(([field, value]) => [field, String(value)]));
  }

  return {};
}
