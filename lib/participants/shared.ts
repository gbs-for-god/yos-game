/**
 * 참여자 신원: 브라우저와 서버가 함께 쓰는 타입·상수.
 *
 * 참여자는 사이트의 어떤 화면을 보기 전에 먼저 자기 이름을 직접 입력해 등록한다(미리 정한 명단은 없다).
 * 그러면 기기에 임의 토큰이 저장되고 서버에 "이 이름은 이 토큰의 기기가 차지했다"고 기록된다.
 * 이후 어느 페이지·게임에서든 토큰만으로 누구인지 알 수 있고, 다른 기기는 같은 이름을 차지할 수 없다.
 */

export const PARTICIPANT_TOKEN_HEADER = "x-participant-token";
/** 사회자 동작에 붙이는 비밀번호 헤더 (검증은 lib/server/hostPin) */
export const HOST_PIN_HEADER = "x-host-pin";

export type ParticipantIdentity = {
  name: string;
  token: string;
};

export type ParticipantsResponse = {
  /** 이미 기기가 등록된 이름 목록 */
  claimed: string[];
  /** 요청에 토큰을 보냈을 때, 그 토큰이 등록된 이름 (해제되었으면 null) */
  me?: string | null;
};

/** 참가자명 최대 길이 (프로젝터 표와 휴대폰 화면에 한 줄로 보이도록) */
export const MAX_NAME_LENGTH = 12;

/** 입력한 참가자명을 정리한다: 앞뒤 공백 제거, 연속 공백은 하나로. */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** 정리된 참가자명이 쓸 수 있는지 확인한다. 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지. */
export function validateName(name: string): string | null {
  if (name.length === 0) return "이름을 입력해 주세요.";
  if ([...name].length > MAX_NAME_LENGTH)
    return `이름은 ${MAX_NAME_LENGTH}자 이하로 입력해 주세요.`;
  return null;
}
