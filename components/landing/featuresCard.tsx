// FeaturesCard.tsx
"use client";

import { cn } from "@/lib/utils";
import { AnimatedList } from "../ui/animated-list";
import { useTranslations } from "next-intl";

interface Item {
 name: string;
 description: string;
 icon: string;
 color: string;
 time: string;
}

let notifications = [
 {
   name: "payment_received_name",
   description: "payment_received_desc",
   time: "15m_ago",
   icon: "💸",
   color: "#00C9A7",
 },
 {
   name: "user_signup_name", 
   description: "user_signup_desc",
   time: "10m_ago",
   icon: "👤",
   color: "#FFB800",
 },
 {
   name: "new_emails_name",
   description: "new_emails_desc", 
   time: "5m_ago",
   icon: "💬",
   color: "#FF3D71",
 },
 {
   name: "easy_deploy_name",
   description: "easy_deploy_desc",
   time: "2m_ago",
   icon: "🗞️",
   color: "#1E86FF",
 },
];

notifications = Array.from({ length: 10 }, () => notifications).flat();

const Notification = ({ name, description, icon, color, time }: Item) => {
 const t = useTranslations('FeaturesCard');
 return (
   <figure
     className={cn(
       "relative mx-auto min-h-fit w-full max-w-[400px] transform cursor-pointer overflow-hidden rounded-2xl p-4",
       "transition-all duration-200 ease-in-out hover:scale-[103%]",
       "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
       "transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
     )}
   >
     <div className="flex flex-row items-center gap-3">
       <div
         className="flex h-10 w-10 items-center justify-center rounded-2xl"
         style={{
           backgroundColor: color,
         }}
       >
         <span className="text-lg">{icon}</span>
       </div>
       <div className="flex flex-col overflow-hidden">
         <figcaption className="flex flex-row items-center whitespace-pre text-lg font-medium dark:text-white ">
           <span className="text-sm sm:text-lg">{t(name)}</span>
           <span className="mx-1">·</span>
           <span className="text-xs text-gray-500">{t(time)}</span>
         </figcaption>
         <p className="text-sm font-normal dark:text-white/60">
           {t(description)}
         </p>
       </div>
     </div>
   </figure>
 );
};

export function FeaturesCard() {
 return (
   <div className="relative flex max-h-[435px] min-h-[435px] flex-col overflow-hidden rounded-2xl border bg-background p-6 shadow-lg dark:border-[#443c3c]">
     <AnimatedList>
       {notifications.map((item, idx) => (
         <Notification {...item} key={idx} />
       ))}
     </AnimatedList>
   </div>
 );
}
