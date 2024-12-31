"use client";

import { TextGenerateEffect } from "./typeWriterEffect";
import { useTranslations } from "next-intl";


export function TypewriterEffectSmooth() {
 const t = useTranslations('TypewriterEffectSmooth');
 
 const words = [
   {
     text: t("word_build"),
   },
   {
     text: t("word_awesome"),
   },
   {
     text: t("word_apps"),
   },
   {
     text: t("word_and"),
   },
   {
     text: t("word_ship"), 
   },
   {
     text: t("word_fast"),
   },
   {
     text: t("word_with"),
   },
   {
     text: t("word_saasfly"),
     className: "text-blue-500",
   },
 ];

 return (
   <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
     <TextGenerateEffect words={words} />
   </p>
 );
}
