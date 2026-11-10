/**
 * /api/settings 의 처리 (서버 전용).
 * - GET 누구나 현재 설정을 읽는다. 사회자 비밀번호 헤더를 보내면 맞는지도 확인한다(틀리면 401)
 * - PUT 사회자만 설정을 바꾼다 ({ allowRename: boolean })
 */

import { checkHostPin, errorResponse, jsonResponse } from "@/lib/server/hostPin";
import { getSettingsStore } from "./store";

export async function getSettings(request: Request): Promise<Response> {
  if (checkHostPin(request) === "wrong") return errorResponse("사회자 비밀번호가 틀렸어요.", 401);
  return jsonResponse(await getSettingsStore().read());
}

export async function updateSettings(request: Request): Promise<Response> {
  if (checkHostPin(request) !== "ok") return errorResponse("사회자만 할 수 있는 동작이에요.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("allowRename" in body) ||
    typeof body.allowRename !== "boolean"
  ) {
    return errorResponse("알 수 없는 요청이에요.", 400);
  }

  const store = getSettingsStore();
  await store.write({ ...(await store.read()), allowRename: body.allowRename });
  return jsonResponse(await store.read());
}
