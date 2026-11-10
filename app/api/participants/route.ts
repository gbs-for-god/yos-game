/**
 * 참여자 신원 API. 실제 처리는 lib/participants/server/ 에 있고 여기는 연결만 한다.
 */

import {
  getParticipants,
  registerParticipant,
  releaseParticipant,
} from "@/lib/participants/server/handlers";

export async function GET(request: Request) {
  return getParticipants(request);
}

export async function POST(request: Request) {
  return registerParticipant(request);
}

export async function DELETE(request: Request) {
  return releaseParticipant(request);
}
