import peopleData from "./data/people.json";
import { validatePeople, type Person } from "./logic";

/** 인물 목록(data/people.json)과 그 유효성 검사 결과. 게임 화면에서 쓴다 */
export const PEOPLE: readonly Person[] = peopleData as readonly Person[];
export const PEOPLE_ERROR = validatePeople(PEOPLE);

const BY_ID = new Map(PEOPLE.map((person) => [person.id, person]));

export function getPerson(id: string): Person {
  const person = BY_ID.get(id);
  if (!person) throw new Error(`알 수 없는 인물 id: ${id}`);
  return person;
}
