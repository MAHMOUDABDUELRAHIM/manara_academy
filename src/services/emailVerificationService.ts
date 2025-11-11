import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_EMAIL_API_URL || "http://localhost:8080/api";

export interface VerificationStatus {
  exists: boolean;
  verified: boolean;
  expired?: boolean;
  expires_at?: number;
}

export const EmailVerificationService = {
  async sendVerification(email: string, name: string) {
    try {
      const res = await fetch(`${API_BASE}/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send verification");
      }
      return data;
    } catch (err: any) {
      console.error("sendVerification error:", err);
      toast.error("فشل إرسال رمز التحقق إلى البريد");
      throw err;
    }
  },

  async verifyOtp(email: string, otp: string) {
    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP");
      }
      return data;
    } catch (err: any) {
      console.error("verifyOtp error:", err);
      throw err;
    }
  },

  async checkStatus(email: string): Promise<VerificationStatus> {
    try {
      const res = await fetch(`${API_BASE}/check-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to check status");
      }
      return {
        exists: data.exists ?? true,
        verified: !!data.verified,
        expired: !!data.expired,
        expires_at: data.expires_at
      };
    } catch (err: any) {
      console.error("checkStatus error:", err);
      throw err;
    }
  },

  async resendOtp(email: string, name: string) {
    return this.sendVerification(email, name);
  }
};