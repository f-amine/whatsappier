import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env } from '@/env.mjs';
import { LfOtpVerificationConfigSchema } from '@/lib/automations/templates/definitions/lf-otp-verification';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { automationId: string } }
) {
  const { automationId } = await params;
  const debug = request.nextUrl.searchParams.get('debug') === 'true';

  try {
    // Find the automation by ID
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      include: {
        user: { select: { id: true } },
        device: { select: { status: true } }
      }
    });

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }
    if (!automation.isActive) {
        return NextResponse.json({ error: 'Automation is inactive' }, { status: 403 });
    }
    if (automation.device?.status !== 'CONNECTED') {
         return NextResponse.json({ error: 'Associated WhatsApp device is not connected' }, { status: 404 });
    }

    // Validate the automation's configuration
    const configValidation = LfOtpVerificationConfigSchema.safeParse(automation.config);
    if (!configValidation.success) {
        console.error(`Invalid config for automation ${automationId}:`, configValidation.error);
        return NextResponse.json({ error: 'Invalid automation configuration' }, { status: 500 });
    }
    
    const userId = automation.userId;

    // API endpoints
    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    const requestOtpEndpoint = `${baseUrl}/api/otp/lightfunnels/request?automationId=${automationId}`;
    const verifyOtpEndpoint = `${baseUrl}/api/otp/lightfunnels/verify`;

    // Load translations
    let translations = {};
    try {
      const translationsPath = path.join(process.cwd(), 'messages', 'whatsapp-otp.json');
      const translationsData = fs.readFileSync(translationsPath, 'utf-8');
      translations = JSON.parse(translationsData);
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to empty object, script will use hardcoded English text
    }

    // Generate the JavaScript code
    const script = `
    // Lightfunnels WhatsApp OTP Verification (Fetch Intercept Only)
    // Generated for automation: ${automation.id} (User: ${userId})
    // Version: 2.4.0
    (function() {
      const automationId = "${automation.id}";
      const userId = "${userId}";
      const verifyApiEndpoint = "${verifyOtpEndpoint}";
      const requestOtpEndpoint = "${requestOtpEndpoint}";
      const debugMode = ${debug};
      let otpVerified = false;
      let pendingCheckoutData = null; // Will now store { buttonToClick, phone, email, shippingCountry, billingCountry }
      let isVerificationInProgress = false;

      const originalFetch = window.fetch;

      // --- Translations logic (same) ---
      const translations = ${JSON.stringify(translations)};
      const defaultTexts = { title: "WhatsApp Verification", message: "We have sent a verification code to your WhatsApp. Please enter it below to complete your purchase.", placeholder: "Enter verification code", verify: "Verify & Continue", cancel: "Cancel", success: "Verification successful! Processing your order...", error: "Invalid verification code. Please try again.", enterCode: "Please enter the verification code" };
      function detectLanguage() { /* ... same ... */ try{const l=document.documentElement.lang;if(l){const g=l.split("-")[0].toLowerCase();if(translations[g])return log("Lang HTML:",g),g}const m=document.querySelector('meta[http-equiv="Content-Language"]');if(m&&m.content){const g=m.content.split("-")[0].toLowerCase();if(translations[g])return log("Lang meta:",g),g}const n=navigator.language.split("-")[0].toLowerCase();if(translations[n])return log("Lang browser:",n),n}catch(e){console.error("Lang detect err:",e)}return log("No lang match, use 'en'"),"en"; }
      function getTexts() { const lang = detectLanguage(); return translations[lang] || translations.en || defaultTexts; }

      function log(...args) {
        if (debugMode) { console.log("WhatsApp OTP:", ...args); }
      }

      log("Script loaded. Mode: Fetch Intercept Only. Automation:", automationId);

      // --- Helper: Find the likely checkout button ---
      // Tries to find the button that might be in a loading state or has common checkout text.
      function findCheckoutButton() {
         // Prioritize buttons with common loading indicators or specific data attributes
         let btn = document.querySelector('button[data-dest][disabled], button[data-dest] .spinner, button[data-dest] .loader');
         if (btn) return btn.closest('button[data-dest]');

         // Fallback to common text patterns (case-insensitive) - Add more if needed
         const commonTexts = ['Complete Order', 'Pay Now', 'Checkout', 'Finalize Purchase', 'Valider', 'Payer', 'Commander'];
         const buttons = document.querySelectorAll('button[data-dest], button[type="submit"]'); // Check common types
         for (const button of buttons) {
             const buttonText = button.textContent?.trim().toLowerCase() || '';
             if (commonTexts.some(text => buttonText.includes(text.toLowerCase()))) {
                 return button;
             }
         }
         log("Could not reliably find the checkout button.");
         return null; // Return null if not found
      }

      // --- Helper: Reset Button State ---
      function resetCheckoutButtonState(button) {
        if (!button) {
           button = findCheckoutButton(); // Try to find it again if not passed
        }
        if (button) {
            log("Resetting button state:", button);
            button.disabled = false;
            // Remove common loading indicators (adjust selectors if needed)
            const spinner = button.querySelector('.spinner, .loader, svg.animate-spin');
            if (spinner) spinner.remove();
            // Try removing common loading classes (inspect element on LF to find exact classes)
            button.classList.remove('loading', 'is-loading', 'btn--loading');
            // Restore original text if possible (difficult without storing it first)
        } else {
            log("Could not find button to reset state.");
        }
      }

      // --- Overridden Fetch Function ---
      window.fetch = async function(url, options) {
        const method = options?.method?.toUpperCase() || 'GET';
        log('Intercepting fetch:', method, url);

        if (method === 'POST' && typeof url === 'string' && url.includes('/api')) { // Adjusted to /graphql
          log('Intercepting /graphql POST request.');
          try {
            const bodyText = options.body ? String(options.body) : '{}';
            const body = JSON.parse(bodyText);

            // Check for 'checkoutCreate' mutation
            if (body.query && body.query.includes('checkoutCreate')) {
              log('Detected checkoutCreate mutation.');

              if (otpVerified || isVerificationInProgress) {
                log("OTP handled, allowing original fetch.");
                return originalFetch.apply(this, arguments);
              }

              log('Attempting to extract data...');
              const payload = body.variables?.payload;

              if (!payload) {
                 log('No payload in variables, allowing original fetch.');
                 return originalFetch.apply(this, arguments);
              }

              let phone = payload.phone || payload.shipping_address?.phone || payload.billing_address?.phone;
              let email = payload.email;
              let shippingCountry = payload.shipping_address?.country;
              let billingCountry = payload.billing_address?.country;

              if (!phone) {
                log('No phone found, allowing original fetch.');
                return originalFetch.apply(this, arguments);
              }

              log('Extracted Data:', { phone, email, shippingCountry, billingCountry });

              // *** Find and Store the button ***
              const checkoutButton = findCheckoutButton();
              if (!checkoutButton) {
                 log("WARNING: Could not find checkout button during fetch intercept. Proceeding without button click capability.");
                 // Allow fetch to proceed if we can't find the button reliably? Or still show modal?
                 // Let's still show the modal, but log the warning.
              }

              pendingCheckoutData = {
                  buttonToClick: checkoutButton, // Store button reference (might be null)
                  phone,
                  email,
                  shippingCountry,
                  billingCountry
              };

              log('Showing OTP modal for phone:', phone);
              showOtpModal(phone, email, shippingCountry, billingCountry);
              return new Promise(() => {}); // Prevent original fetch

            } else {
              log('Not checkoutCreate mutation.');
            }
          } catch (error) {
            console.error('WhatsApp OTP: Error processing GraphQL request', error);
            log('Error occurred, allowing original fetch.');
          }
        }

        return originalFetch.apply(this, arguments);
      };
      // --- End Fetch Override ---

      // --- Request OTP Function (same) ---
      async function requestOtp(phone, email, shippingCountry, billingCountry) {
        // ... same logic ...
        try { log('Requesting OTP for phone:', phone, 'with countries:', { shippingCountry, billingCountry }); return new Promise((resolve, reject) => { const x = new XMLHttpRequest(); x.open('POST', requestOtpEndpoint, true); x.setRequestHeader('Content-Type', 'application/json'); x.onload = function() { if (x.status >= 200 && x.status < 300) { try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); } } else { log("OTP Req failed", x.status, x.responseText); reject(new Error('Request failed with status ' + x.status)); } }; x.onerror = function() { log("OTP Req XHR error"); reject(new Error('XHR request failed')); }; x.send(JSON.stringify({ phone, email, shippingCountry, billingCountry })); }); } catch (error) { console.error('WhatsApp OTP: Error requesting OTP', error); }
      }

      // --- Verify OTP Function (same) ---
      async function verifyOtp(userId, phone, email, otp, shippingCountry, billingCountry) {
        // ... same logic ...
        try { log('Verifying OTP for phone:', phone); return new Promise((resolve, reject) => { const x = new XMLHttpRequest(); x.open('POST', verifyApiEndpoint, true); x.setRequestHeader('Content-Type', 'application/json'); x.onload = function() { if (x.status >= 200 && x.status < 300) { try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); } } else { log("OTP Verify failed", x.status, x.responseText); reject(new Error('Request failed with status ' + x.status)); } }; x.onerror = function() { log("OTP Verify XHR error"); reject(new Error('XHR request failed')); }; x.send(JSON.stringify({ userId, phone, email, otp, shippingCountry, billingCountry })); }); } catch (error) { console.error('WhatsApp OTP: Error verifying OTP', error); throw error; }
      }

      // --- Show OTP Modal (Updated Button Logic) ---
      function showOtpModal(phone, email, shippingCountry, billingCountry) {
        if (isVerificationInProgress) return; isVerificationInProgress = true;
        const texts = getTexts(); log("Using texts:", texts);
        const existingModal = document.getElementById('whatsapp-otp-modal'); if (existingModal) { document.body.removeChild(existingModal); }

        // --- Modal creation (same) ---
        const modal = document.createElement('div'); modal.id = 'whatsapp-otp-modal'; Object.assign(modal.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '999999' });
        const storeButtons = document.querySelectorAll('button'); let pC = '#4CAF50', pTC = 'white'; for (const b of storeButtons) { const s = window.getComputedStyle(b); const bg = s.backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { pC = bg; pTC = s.color; break; } }
        const modalContent = document.createElement('div'); Object.assign(modalContent.style, { backgroundColor: 'white', color: 'black', padding: '30px', borderRadius: '8px', width: '360px', maxWidth: '90%', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' });
        const title = document.createElement('h3'); title.textContent = texts.title; Object.assign(title.style, { marginBottom: '15px', fontSize: '1.25rem', fontWeight: 'bold' });
        const message = document.createElement('p'); message.textContent = texts.message; Object.assign(message.style, { marginBottom: '20px', color: '#666' });
        const otpInput = document.createElement('input'); otpInput.type = 'text'; otpInput.placeholder = texts.placeholder; Object.assign(otpInput.style, { width: '100%', padding: '12px', marginBottom: '15px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' });
        const statusMsg = document.createElement('p'); Object.assign(statusMsg.style, { color: 'red', margin: '10px 0', display: 'none', fontSize: '14px' });
        const buttonContainer = document.createElement('div'); Object.assign(buttonContainer.style, { display: 'flex', justifyContent: 'space-between', marginTop: '20px' });
        const verifyBtn = document.createElement('button'); verifyBtn.textContent = texts.verify; Object.assign(verifyBtn.style, { padding: '12px 16px', backgroundColor: pC, color: pTC, border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', flexGrow: '1', marginRight: '10px' });
        const cancelBtn = document.createElement('button'); cancelBtn.textContent = texts.cancel; Object.assign(cancelBtn.style, { padding: '12px 16px', backgroundColor: '#f5f5f5', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' });
        buttonContainer.appendChild(verifyBtn); buttonContainer.appendChild(cancelBtn);
        modalContent.appendChild(title); modalContent.appendChild(message); modalContent.appendChild(otpInput); modalContent.appendChild(statusMsg); modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent); document.body.appendChild(modal);

        // --- Cancel Button Logic (Reset Button State) ---
        cancelBtn.addEventListener('click', function() {
          log("Modal cancelled by user.");
          resetCheckoutButtonState(pendingCheckoutData?.buttonToClick); // Attempt to reset the stored button
          document.body.removeChild(modal);
          isVerificationInProgress = false;
          pendingCheckoutData = null; // Clear pending data on cancel
        });
        // --- End Cancel Button Logic ---

        requestOtp(phone, email, shippingCountry, billingCountry);
        setTimeout(() => otpInput.focus(), 100);

        // --- Verify Button Logic (Click Original Button) ---
        verifyBtn.addEventListener('click', async function() {
            const otp = otpInput.value.trim(); if (!otp) { statusMsg.textContent = texts.enterCode; statusMsg.style.display = 'block'; return; }
            verifyBtn.disabled = true; verifyBtn.textContent = 'Verifying...'; verifyBtn.style.opacity = '0.7';
            try {
                // Pass userId to verifyOtp
                const data = await verifyOtp(userId, phone, email, otp, shippingCountry, billingCountry);
                if (data.success) {
                    statusMsg.textContent = texts.success; statusMsg.style.color = 'green'; statusMsg.style.display = 'block';
                    otpVerified = true;
                    setTimeout(() => {
                        document.body.removeChild(modal); isVerificationInProgress = false;
                        if (pendingCheckoutData && pendingCheckoutData.buttonToClick) {
                            log('OTP Verified. Clicking original checkout button.');
                            // *** CLICK THE STORED BUTTON ***
                            pendingCheckoutData.buttonToClick.click();
                        } else if (pendingCheckoutData) {
                            // Fallback: try re-finding button if it wasn't stored? Less ideal.
                            log("WARNING: Button reference was lost, trying to find and click again.");
                            const btn = findCheckoutButton();
                            if(btn) btn.click();
                            else log("ERROR: Could not find button to click after verification.");
                        } else {
                             log('ERROR: No pendingCheckoutData available after verification.');
                        }
                        pendingCheckoutData = null; // Clear pending data
                    }, 1500); // Delay to show success message
                } else { /* ... handle verify error (same) ... */ statusMsg.textContent = data.message || texts.error; statusMsg.style.display = 'block'; verifyBtn.disabled = false; verifyBtn.textContent = texts.verify; verifyBtn.style.opacity = '1'; }
            } catch (error) { /* ... handle verify exception (same) ... */ statusMsg.textContent = texts.error; statusMsg.style.display = 'block'; verifyBtn.disabled = false; verifyBtn.textContent = texts.verify; verifyBtn.style.opacity = '1'; console.error('WhatsApp OTP: Error verifying OTP', error); }
        });
        // --- End Verify Button Logic ---
      }

      log("WhatsApp OTP verification ready (Fetch Intercept Mode - Button Click on Verify).");
      // No call to monitorBuyNowButtons
    })();
    `;

    return new NextResponse(script, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error generating Lightfunnels OTP script:', error);
    return NextResponse.json({ error: 'Failed to generate script' }, { status: 500 });
  }
}
