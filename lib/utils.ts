import { Static, TSchema, Type } from "@sinclair/typebox"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function isNil<T>(value: T | null | undefined): value is null | undefined {
    return value === null || value === undefined
}

export const Nullable = <T extends TSchema>(schema: T) => Type.Optional(Type.Unsafe<Static<T> | null>({
    ...schema, nullable: true,
}))
