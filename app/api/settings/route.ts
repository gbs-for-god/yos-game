/**
 * 사이트 설정 API. 실제 처리는 lib/settings/server/ 에 있고 여기는 연결만 한다.
 */

import { getSettings, updateSettings } from "@/lib/settings/server/handlers";

export async function GET(request: Request) {
  return getSettings(request);
}

export async function PUT(request: Request) {
  return updateSettings(request);
}
