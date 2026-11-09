/**
 * 마니또 미션 세션 API. 실제 처리는 games/manito-mission/server/ 에 있고 여기는 연결만 한다.
 * - GET    현재 상태 (x-host-pin 헤더가 맞으면 전체 배정표 포함, ?name= 으로 본인 배정 포함)
 * - POST   동작 수행 ({ type: "viewed" | "start" | ... }, 사회자 동작은 x-host-pin 필요)
 * - DELETE 시작 전 상태로 초기화 (사회자 전용)
 */

import { clearState, getState, postAction } from "@/games/manito-mission/server/handlers";

export async function GET(request: Request) {
  return getState(request);
}

export async function POST(request: Request) {
  return postAction(request);
}

export async function DELETE(request: Request) {
  return clearState(request);
}
