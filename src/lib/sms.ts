/**
 * Zero Group Unified SMS Gateway Dispatcher
 * Supports:
 * 1. Personal Android SIM Gateway (TextBee - 100% Free carrier SMS via your own SIM)
 * 2. Personal Android SMS Gateway (sms-gate.app)
 * 3. Fast2SMS (Indian carrier OTP route)
 * 4. Twilio (Global direct carrier SMS)
 * 5. WhatsApp Direct OTP Fallback (100% free, zero DLT blocks in India)
 */

export interface SmsSendResult {
  success: boolean;
  provider: "sim_gateway" | "fast2sms" | "twilio" | "dev_mode";
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

  // 1. PERSONAL ANDROID SIM GATEWAY (TextBee - Free SMS using your own Jio/Airtel SIM)
  const textbeeApiKey = process.env.TEXTBEE_API_KEY;
  const textbeeDeviceId = process.env.TEXTBEE_DEVICE_ID;
  if (textbeeApiKey && textbeeDeviceId) {
    try {
      const res = await fetch(
        `https://api.textbee.dev/api/v1/gateway/devices/${textbeeDeviceId}/sendSMS`,
        {
          method: "POST",
          headers: {
            "x-api-key": textbeeApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            receipients: [internationalPhone],
            message: otpMessage,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && (data.success || data.status === "success" || data.data)) {
        console.log(`[SMS-SIM] Dispatched SMS via your SIM card to ${internationalPhone}:`, data);
        return { success: true, provider: "sim_gateway", messageId: data.data?.id || "sim-ok", whatsappUrl };
      }
      console.warn(`[SMS-SIM] TextBee API error:`, data);
    } catch (err: any) {
      console.error(`[SMS-SIM] TextBee network error:`, err);
    }
  }

  // 2. ALTERNATIVE ANDROID SIM GATEWAY (sms-gate.app)
  const simGatewayUrl = process.env.SIM_GATEWAY_URL;
  const simGatewayToken = process.env.SIM_GATEWAY_TOKEN;
  if (simGatewayUrl && simGatewayToken) {
    try {
      const res = await fetch(simGatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${simGatewayToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumbers: [internationalPhone],
          message: otpMessage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[SMS-SIM] Android SMS Gateway dispatched via SIM to ${internationalPhone}:`, data);
        return { success: true, provider: "sim_gateway", messageId: "sim-gate-ok", whatsappUrl };
      }
      console.warn(`[SMS-SIM] Android SMS Gateway error:`, data);
    } catch (err: any) {
      console.error(`[SMS-SIM] Android SMS Gateway network error:`, err);
    }
  }

  // 3. FAST2SMS (India Direct OTP Gateway)
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

  // 4. TWILIO (Direct Global Carrier SMS)
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

  // 5. Fallback / Dev Mode
  console.log(`[SMS DEV-MODE] OTP for +91${phone10}: ${otp} (WhatsApp: ${whatsappUrl})`);
  return {
    success: true,
    provider: "dev_mode",
    whatsappUrl,
  };
}
