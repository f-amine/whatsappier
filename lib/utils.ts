import { DeviceStatus } from "@prisma/client"
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

export const statusMap: Record<string, DeviceStatus> = {
  'open': DeviceStatus.CONNECTED,
  'connecting': DeviceStatus.CONNECTING,
  'close': DeviceStatus.DISCONNECTED,
  'refused': DeviceStatus.ERROR
}

/**
 * Generates a random numeric OTP code of the specified length
 * @param length The length of the OTP code (default: 6)
 * @returns A string containing the numeric OTP code
 */
export function generateOTP(length: number = 6): string {
  const chars = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return otp;
}

/**
 * Validates if a phone number is in a valid format
 * @param phone The phone number to validate
 * @returns True if the phone number is valid, false otherwise
 */
export function validatePhoneNumber(phone: string): boolean {
  // Basic validation - at least 8 digits, can have a leading +
  // This is a simple check, consider using a library like libphonenumber-js for production
  return /^(\+)?[0-9]{8,15}$/.test(phone.replace(/[\s()-]/g, ''));
}

/**
 * Formats a phone number with a country code if it doesn't already have one
 * @param phone The phone number to format
 * @param defaultCountryCode The default country code to add if missing
 * @returns The formatted phone number with country code
 */
export function formatPhoneNumberWithCountryCode(phone: string, defaultCountryCode: string = '33'): string {
  // Remove any non-digit characters except the leading +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // If the phone already has a + prefix, assume it has a country code
  if (cleanPhone.startsWith('+')) {
    return cleanPhone;
  }
  
  // If the phone starts with a 0, remove it before adding the country code
  const numberWithoutLeadingZero = cleanPhone.startsWith('0') 
    ? cleanPhone.substring(1) 
    : cleanPhone;
  
  // Add the country code with + prefix
  return `+${defaultCountryCode}${numberWithoutLeadingZero}`;
}
