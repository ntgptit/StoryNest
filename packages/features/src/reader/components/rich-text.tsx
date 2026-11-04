import { Fragment, type ReactNode } from "react";
import { splitByMarks, type MarkType, type TextMark } from "../model/chapter.ts";

const WRAPPERS: Record<MarkType, (children: ReactNode) => ReactNode> = {
  bold: (c) => <strong>{c}</strong>,
  italic: (c) => <em>{c}</em>,
  underline: (c) => <u>{c}</u>,
  strike: (c) => <s>{c}</s>,
};

/** Block text with its inline marks applied. Plain text nodes only: nothing from the database becomes HTML. */
export function RichText({ text, marks }: { text: string; marks: readonly TextMark[] }) {
  return (
    <>
      {splitByMarks(text, marks).map((segment, index) => (
        <Fragment key={index}>
          {segment.marks.reduce<ReactNode>((inner, mark) => WRAPPERS[mark](inner), segment.text)}
        </Fragment>
      ))}
    </>
  );
}
