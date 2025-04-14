import { phone } from 'phone';

// Define the result type for phone processing
export interface ProcessPhoneResult {
  isValid: boolean;
  phoneNumber: string | null;
  usedCountry: string | null;
}

/**
 * Processes a phone number string, attempting to validate and format it
 * using country codes from shipping or billing addresses.
 * @param phoneNumber The raw phone number string from the payload.
 * @param shippingCountry The country code from the shipping address (e.g., 'PL').
 * @param billingCountry The country code from the billing address (e.g., 'MA').
 * @returns ProcessPhoneResult containing validation status, formatted number, and country used.
 */
export function processPhoneNumber(
  phoneNumber: string,
  shippingCountry?: string | null,
  billingCountry?: string | null
): ProcessPhoneResult {

  // Clean the input number - remove non-digit characters except '+'
  const cleanedPhoneNumber = phoneNumber.replace(/[^+\d]/g, '');

  // Try validating with shipping country
  if (shippingCountry) {
    const shippingResult = phone(cleanedPhoneNumber, { country: shippingCountry });
    if (shippingResult.isValid) {
      return {
        isValid: true,
        phoneNumber: shippingResult.phoneNumber.replace(/\D/g, ''), // Format to digits only
        usedCountry: shippingCountry
      };
    }
  }

  // Try validating with billing country if shipping failed
  if (billingCountry) {
    const billingResult = phone(cleanedPhoneNumber, { country: billingCountry });
    if (billingResult.isValid) {
      return {
        isValid: true,
        phoneNumber: billingResult.phoneNumber.replace(/\D/g, ''), // Format to digits only
        usedCountry: billingCountry
      };
    }
  }

  // If neither country worked, try without a specific country hint (global parsing)
  const globalResult = phone(cleanedPhoneNumber);
  if (globalResult.isValid) {
      return {
          isValid: true,
          phoneNumber: globalResult.phoneNumber.replace(/\D/g, ''),
          usedCountry: globalResult.countryCode
      };
  }

  // If all attempts failed
  return {
    isValid: false,
    phoneNumber: null,
    usedCountry: null
  };
}
