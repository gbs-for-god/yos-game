/** 사이트 전체 설정 (사회자가 /host 에서 바꾼다). 브라우저와 서버가 함께 쓰는 타입·상수 */

export type SiteSettings = {
  /** 참가자가 상단에서 자기 이름을 바꿀 수 있는지. 기본은 꺼짐 */
  allowRename: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = { allowRename: false };

/** 사회자에게만 공개하는 설정. 입장코드는 일반 설정 응답에 포함하지 않는다 */
export type HostSettings = SiteSettings & { entryCode: string };
export const MAX_ENTRY_CODE_LENGTH = 32;
