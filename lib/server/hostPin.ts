/**
 * 서버 전용: 사회자 비밀번호 확인.
 * 로그인이 없으므로 사회자 동작은 x-host-pin 헤더로 구분한다.
 */

import { HOST_PIN_HEADER } from "@/lib/participants/shared";

/** HOST_PIN 환경 변수가 없을 때 쓰는 기본 비밀번호 (로컬 개발·E2E 용). 운영에서는 반드시 HOST_PIN 을 설정한다 */
export const DEFAULT_HOST_PIN = "0000";

export function hostPin(): string {
  return process.env.HOST_PIN || DEFAULT_HOST_PIN;
}

/** 헤더가 없으면 "none"(일반 참여자), 있으면 일치 여부 */
export function checkHostPin(request: Request): "none" | "ok" | "wrong" {
  const pin = request.headers.get(HOST_PIN_HEADER);
  if (pin === null) return "none";
  return pin === hostPin() ? "ok" : "wrong";
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}
