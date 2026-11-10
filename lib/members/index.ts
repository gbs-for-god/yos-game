/**
 * 사이트 전체가 공유하는 명단 (사회자 1명 + 참여자).
 * 어떤 게임이든 참여자 이름이 필요하면 여기서 가져온다. 명단 수정은 members.json 에서만 한다.
 */

import membersData from "./members.json";

export type Members = {
  /** 사회자 비밀번호 기본값. 운영 환경에서는 HOST_PIN 환경 변수로 덮어쓴다 */
  hostPin: string;
  /** 사회자(관리자) 이름. 사회자도 게임에 참여한다 */
  host: string;
  /** 참여자 이름 목록 (사회자 제외) */
  participants: string[];
};

export const MEMBERS: Members = membersData;

export const MIN_MEMBERS = 2;

/** 사회자를 마지막에 둔 전체 멤버 이름 (게임의 공개 순서로도 쓰인다). */
export function listMemberNames(members: Members = MEMBERS): string[] {
  return [...members.participants, members.host];
}

export function isMemberName(name: string, members: Members = MEMBERS): boolean {
  return listMemberNames(members).includes(name);
}

/** 명단 유효성 검사. 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지를 돌려준다. */
export function validateMembers(members: Members = MEMBERS): string | null {
  const names = listMemberNames(members).map((n) => n.trim());
  if (names.some((n) => n.length === 0)) return "이름이 비어 있는 항목이 있어요.";
  if (new Set(names).size !== names.length) return "같은 이름이 두 번 이상 있어요.";
  if (names.length < MIN_MEMBERS) return `게임을 하려면 최소 ${MIN_MEMBERS}명이 필요해요.`;
  return null;
}
