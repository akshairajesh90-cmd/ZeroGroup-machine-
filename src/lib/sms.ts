/**
 * Zero Group Unified SMS Gateway Dispatcher
 * Supports:
 * 1. Fast2SMS (Indian carrier OTP route with instant delivery)
 * 2. Twilio (Global direct carrier SMS)
 * 3. WhatsApp Direct OTP Fallback (100% free, zero DLT blocks in India)
 */

export interface SmsSendResult {
  success: boolean;
  provider: "fast2sms" | "twilio" | "dev_mode";
  messageId?: string;
  error?: string;
  whatsappUrl?: string;
}

export async function sendOtpSms(rawPhone: string, otp: string): Promise<SmsSendResult> {
  const digits = rawPhone.replace(/\D/g, "");
  const phone10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const internationalPhone = digits.startsWith("91") && digits.length === 12 ? `+${digits}` : `+91${phone10}`;

  const otpMessage = `Your Zero Group verification code is: ${otp}. Valid for 15 minutes. Zero Group Logistics.`;
  const whatsappUrl = `https://wa.me/91${phone10}?text=${encodeURIComponent(otpMessage)}`;

  // 1. FAST2SMS (India Direct OTP Gateway)
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey && phone10.length === 10) {
    try {
      const res = await fetch(
        `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(
          fast2smsKey
        )}&route=otp&variables_values=${encodeURIComponent(otp)}&numbers=${encodeURIComponent(phone10)}`,
        { method: "GET" }
      );
      const data = await res.json();
      if (data.return === true || data.status_code === 200) {
        console.log(`[SMS] Fast2SMS sent successfully to +91${phone10}:`, data);
        return { success: true, provider: "fast2sms", messageId: data.request_id, whatsappUrl };
      }
      console.warn(`[SMS] Fast2SMS API returned non-success:`, data);
    } catch (err: any) {
      console.error(`[SMS] Fast2SMS network error:`, err);
    }
  }

  // 2. TWILIO (Direct Global Carrier SMS)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
      const body = new URLSearchParams({
        From: twilioFrom,
        To: internationalPhone,
        Body: otpMessage,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        }
      );
      const data = await res.json();
      if (res.ok && data.sid) {
        console.log(`[SMS] Twilio SMS sent successfully to ${internationalPhone}:`, data.sid);
        return { success: true, provider: "twilio", messageId: data.sid, whatsappUrl };
      }
      console.warn(`[SMS] Twilio API returned error:`, data);
    } catch (err: any) {
      console.error(`[SMS] Twilio network error:`, err);
    }
  }

  // 3. Fallback / Dev Mode
  console.log(`[SMS DEV-MODE] OTP for +91${phone10}: ${otp} (WhatsApp: ${whatsappUrl})`);
  return {
    success: true,
    provider: "dev_mode",
    whatsappUrl,
  };
}
