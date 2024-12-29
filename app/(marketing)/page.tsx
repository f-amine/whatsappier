import { DocumentGuide } from "@/components/landing/document-guide";
import { FeaturesCard } from "@/components/landing/featuresCard";
import { Meteorss } from "@/components/landing/meteors";
import ShimmerButton from "@/components/landing/shimmerButton";
import { TypewriterEffectSmooth } from "@/components/landing/typeWriterEffectSmooth";
import { XBlogArticle } from "@/components/landing/xBlogArticle";
import { Icons } from "@/components/shared/icons";
import type { Meteor } from "@/types";
import Link from "next/link";

const meteors_data: Meteor = {
  name: "Join our Discord",
  description:
    "Join our Discord server to chat with other developers and get help.",
  button_content: "Chat with us",
  url: "https://discord.gg/8SwSX43wnD",
};
export default function Home() {
  return (

      <section className="w-full px-8 sm:px-48 md:px-48 xl:h-[100vh] xl:px-48">
        <div className="grid grid-cols-1 gap-10 pb-10 md:pb-40 xl:grid-cols-2">
          <div className="flex flex-col items-start">
            <div className="flex flex-col pt-4 md:pt-28 lg:pt-28 xl:pt-28">
              <Link href="https://document.saasfly.io" target="_blank">
                <DocumentGuide>
                  {"Introducing Saasfly"}
                </DocumentGuide>
              </Link>

              <div className="mt-6">
                <h1 className="relative mb-6 max-w-4xl text-left text-4xl font-bold dark:text-zinc-100 sm:text-7xl md:text-7xl xl:text-7xl">
                  {
                    "Saasfly: A new SaaS player? Make things easier."}
                </h1>
              </div>

              <div>
                <span className="text-zinc-500 sm:text-xl">
                  {
                    "Your complete All-in-One solution for building SaaS services."}
                </span>
                <TypewriterEffectSmooth />
              </div>

              <div className="mb-4 mt-6 flex w-full flex-col justify-center space-y-4 sm:flex-row sm:justify-start sm:space-x-8 sm:space-y-0">
                <Link href={`/login`}>
                  <ShimmerButton className="mx-auto flex justify-center">
                    <span className="z-10 w-48 whitespace-pre bg-gradient-to-b from-black from-30% to-gray-300/80 bg-clip-text text-center text-sm font-semibold leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 dark:text-transparent">
                      {'Get started'}
                    </span>
                  </ShimmerButton>
                </Link>

                <Link href="https://github.com/saasfly/saasfly" target="_blank">
                  <div className="flex h-full items-center justify-center">
                    <Icons.gitHub className="mr-2 h-6 w-6" />
                    <span className="text-base font-semibold">
                      {"View on GitHub"}
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          <div className="hidden h-full w-full xl:block">
            <div className="flex flex-col pt-28">
              <Meteorss meteor={meteors_data} />
              <div className="mt-4 flex w-full justify-between">
                <XBlogArticle />
                <div className="ml-4">
                  <FeaturesCard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


  );
}
