/** 사회자 비밀번호를 이 탭(sessionStorage)에만 기억하는 저장소. /host 메뉴와 게임의 사회자 화면이 함께 쓴다 */

import { createStorageStore } from "@/lib/hooks/useStoredValue";

export const hostPinStore = createStorageStore("session", "yos-game:host-pin");
