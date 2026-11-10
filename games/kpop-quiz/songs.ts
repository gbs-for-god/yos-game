import songsData from "./data/songs.json";
import { validateSongs, type Song } from "./logic";

/** 곡 목록(data/songs.json)과 그 유효성 검사 결과. 게임 화면과 사회자 메뉴 패널이 함께 쓴다 */
export const SONGS: readonly Song[] = songsData as readonly Song[];
export const SONGS_ERROR = validateSongs(SONGS);
