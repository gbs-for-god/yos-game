import { cn } from "@/lib/cn";
import { isRevealed, type QuizState } from "./logic";

type QuestionListProps = {
  quiz: QuizState;
  /** 목록에서 문제를 눌렀을 때 (0부터 시작하는 번호) */
  onSelect: (index: number) => void;
};

/**
 * 문제 목록. 문제를 누르면 그 곡으로 이동한다.
 * 정답을 공개한 문제는 "번호 + 노래제목", 공개 전 문제는 번호만 보여 준다(공개 전 곡의 제목은 DOM 에도 없다).
 * 공개 여부는 항목의 배경·테두리 색으로도 구분한다
 * (공개 = 초록, 미공개 = 회색). 지금 보고 있는 문제는 보라색 고리로 따로 표시하며, 스크린 리더에는 이름으로 공개 여부를 알려 준다.
 */
export function QuestionList({ quiz, onSelect }: QuestionListProps) {
  return (
    <nav aria-label="문제 목록" className="w-full max-w-5xl">
      <ol
        data-testid="question-list"
        className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3"
      >
        {quiz.songs.map((song, i) => {
          const revealed = isRevealed(quiz, song);
          const current = i === quiz.index;
          const number = i + 1;
          return (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={current ? "true" : undefined}
                aria-label={
                  revealed
                    ? `${number}번 ${song.title} 정답 공개됨`
                    : `${number}번 문제 정답 미공개`
                }
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border-4 px-4 py-3 text-left text-2xl font-bold transition-colors",
                  revealed
                    ? "border-emerald-500 bg-emerald-900 text-emerald-50 hover:bg-emerald-800"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                  current && "ring-4 ring-indigo-400 ring-offset-4 ring-offset-zinc-950",
                )}
              >
                <span className="shrink-0 tabular-nums">{number}</span>
                {revealed && <span className="min-w-0 flex-1 truncate">{song.title}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
