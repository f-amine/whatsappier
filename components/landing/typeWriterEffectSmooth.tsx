"use client";

import { TextGenerateEffect } from "./typeWriterEffect";


export function TypewriterEffectSmooth() {
  const words = [
    {
      text: "Build",
    },
    {
      text: "awesome",
    },
    {
      text: "apps",
    },
    {
      text: "and",
    },
    {
      text: "ship",
    },
    {
      text: "fast",
    },
    {
      text: "with",
    },
    {
      text: "Saasfly.",
      className: "text-blue-500",
    },
  ];
  return (
    <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
      <TextGenerateEffect words={words} />
    </p>
  );
}
