"use client";

import { useState } from "react";
import { placeholderImage, type Person } from "./logic";

type PersonImageProps = {
  person: Person;
  className?: string;
};

/** 인물 사진. 파일이 없거나 불러오지 못하면 번호가 적힌 자리표시 이미지를 대신 보여 준다 */
export function PersonImage({ person, className }: PersonImageProps) {
  const [failed, setFailed] = useState(false);
  return (
    // 사회자가 넣는 임의의 로컬 사진/외부 주소를 그대로 쓰므로 next/image 최적화 대신 <img> 를 쓴다
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed ? placeholderImage(person) : person.image}
      alt={`인물 사진 ${person.id}`}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
