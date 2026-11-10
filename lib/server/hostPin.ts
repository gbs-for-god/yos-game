/**
 * 서버 전용: 사회자 비밀번호 확인.
 * 로그인이 없으므로 사회자 동작은 x-host-pin 헤더로 구분한다.
 */

import { MEMBERS } from "@/lib/members";
import { HOST_PIN_HEADER } from "@/lib/participants/shared";

export function hostPin(): string {
  return process.env.HOST_PIN ?? MEMBERS.hostPin;
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
