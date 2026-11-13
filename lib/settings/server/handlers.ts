/** 사이트 설정은 일반 참가자에게 공개 항목만, 사회자에게 입장코드도 반환한다. */
import { checkHostPin, errorResponse, jsonResponse } from "@/lib/server/hostPin";
import { MAX_ENTRY_CODE_LENGTH } from "../shared";
import { getSettingsStore } from "./store";

export async function getSettings(request: Request): Promise<Response> {
  const pin = checkHostPin(request);
  if (pin === "wrong") return errorResponse("사회자 비밀번호가 틀렸어요.", 401);
  const settings = await getSettingsStore().read();
  return jsonResponse(pin === "ok" ? settings : { allowRename: settings.allowRename });
}

export async function updateSettings(request: Request): Promise<Response> {
  if (checkHostPin(request) !== "ok") return errorResponse("사회자만 할 수 있는 동작이에요.", 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return errorResponse("알 수 없는 요청이에요.", 400);
  if (!("allowRename" in body) && !("entryCode" in body))
    return errorResponse("알 수 없는 요청이에요.", 400);
  if ("allowRename" in body && typeof body.allowRename !== "boolean")
    return errorResponse("알 수 없는 요청이에요.", 400);
  if (
    "entryCode" in body &&
    (typeof body.entryCode !== "string" ||
      !body.entryCode.trim() ||
      body.entryCode.trim().length > MAX_ENTRY_CODE_LENGTH)
  )
    return errorResponse(`입장코드는 1~${MAX_ENTRY_CODE_LENGTH}자로 입력해 주세요.`, 400);
  const store = getSettingsStore();
  const settings = await store.read();
  if ("allowRename" in body && typeof body.allowRename === "boolean")
    settings.allowRename = body.allowRename;
  if ("entryCode" in body && typeof body.entryCode === "string")
    settings.entryCode = body.entryCode.trim();
  await store.write(settings);
  return jsonResponse(settings);
}
