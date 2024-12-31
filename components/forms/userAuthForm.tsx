"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";
import { userAuthSchema } from "@/lib/validation/auth";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
 type?: string;
}

type FormData = z.infer<typeof userAuthSchema>;

export function UserAuthForm({ className, type, ...props }: UserAuthFormProps) {
 const t = useTranslations('UserAuthForm');
 const {
   register,
   handleSubmit,
   formState: { errors },
 } = useForm<FormData>({
   resolver: zodResolver(userAuthSchema),
 });
 const [isLoading, setIsLoading] = React.useState<boolean>(false);
 const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);
 const searchParams = useSearchParams();

 async function onSubmit(data: FormData) {
   setIsLoading(true);

   const signInResult = await signIn("resend", {
     email: data.email.toLowerCase(),
     redirect: false,
     callbackUrl: searchParams?.get("from") || "/dashboard",
   });

   setIsLoading(false);

   if (!signInResult?.ok) {
     return toast.error(t("error_title"), {
       description: t("error_description")
     });
   }

   return toast.success(t("success_title"), {
     description: t("success_description"),
   });
 }

 return (
   <div className={cn("grid gap-6", className)} {...props}>
     <form onSubmit={handleSubmit(onSubmit)}>
       <div className="grid gap-2">
         <div className="grid gap-1">
           <Label className="sr-only" htmlFor="email">
             {t("email_label")}
           </Label>
           <Input
             id="email"
             placeholder={t("email_placeholder")}
             type="email"
             autoCapitalize="none"
             autoComplete="email"
             autoCorrect="off"
             disabled={isLoading || isGoogleLoading}
             {...register("email")}
           />
           {errors?.email && (
             <p className="px-1 text-xs text-red-600">
               {errors.email.message}
             </p>
           )}
         </div>
         <button className={cn(buttonVariants())} disabled={isLoading}>
           {isLoading && (
             <Icons.spinner className="mr-2 size-4 animate-spin" />
           )}
           {type === "register" ? t("signup_email") : t("signin_email")}
         </button>
       </div>
     </form>
     <div className="relative">
       <div className="absolute inset-0 flex items-center">
         <span className="w-full border-t" />
       </div>
       <div className="relative flex justify-center text-xs uppercase">
         <span className="bg-background px-2 text-muted-foreground">
           {t("continue_with")}
         </span>
       </div>
     </div>
     <button
       type="button"
       className={cn(buttonVariants({ variant: "outline" }))}
       onClick={() => {
         setIsGoogleLoading(true);
         signIn("google");
       }}
       disabled={isLoading || isGoogleLoading}
     >
       {isGoogleLoading ? (
         <Icons.spinner className="mr-2 size-4 animate-spin" />
       ) : (
         <Icons.google className="mr-2 size-4" />
       )}{" "}
       {t("google")}
     </button>
   </div>
 );
}
