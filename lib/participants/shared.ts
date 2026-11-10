/**
 * 참여자 신원: 브라우저와 서버가 함께 쓰는 타입·상수.
 *
 * 참여자는 사이트에 처음 들어올 때 명단에서 자기 이름을 고른다. 그러면 기기에 임의 토큰이 저장되고
 * 서버에 "이 이름은 이 토큰의 기기가 차지했다"고 기록된다. 이후 어느 페이지·게임에서든
 * 토큰만으로 누구인지 알 수 있고, 다른 기기는 같은 이름을 차지할 수 없다.
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
