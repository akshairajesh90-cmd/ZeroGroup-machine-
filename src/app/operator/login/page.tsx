"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogIn, Delete } from "lucide-react";

export default function OperatorLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"PHONE" | "PIN">("PHONE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePadPress = (num: string) => {
    setError("");
    if (step === "PHONE") {
      if (phone.length < 10) setPhone(prev => prev + num);
    } else {
      if (pin.length < 4) setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    if (step === "PHONE") setPhone(prev => prev.slice(0, -1));
    else setPin(prev => prev.slice(0, -1));
  };

  const handleNext = () => {
    if (step === "PHONE") {
      if (phone.length < 10) {
        setError("Phone number must be 10 digits");
        return;
      }
      setStep("PIN");
    } else {
      if (pin.length < 4) {
        setError("PIN must be 4 digits");
        return;
      }
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        phone,
        pin,
      });

      if (res?.error) {
        setError("Invalid Phone or PIN");
        setPin("");
        setLoading(false);
      } else {
        router.push("/operator/home");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white uppercase tracking-widest">Zero Group</h1>
          <p className="text-sm font-bold text-orange-500 uppercase tracking-widest">Operator Portal</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          {error && <p className="text-red-500 text-center text-xs font-bold mb-4 uppercase">{error}</p>}
          
          <div className="mb-8">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 text-center">
              {step === "PHONE" ? "Enter Mobile Number" : "Enter 4-Digit PIN"}
            </label>
            <div className="text-4xl font-black text-white tracking-[0.2em] text-center h-12">
              {step === "PHONE" ? phone || ".........." : "•".repeat(pin.length) + ".".repeat(4 - pin.length)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePadPress(num.toString())}
                className="h-16 rounded-xl bg-zinc-800 text-2xl font-black text-white active:bg-zinc-700 transition-colors flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => step === "PIN" ? setStep("PHONE") : setPhone("")}
              className="h-16 rounded-xl bg-zinc-900 text-xs font-black text-zinc-500 uppercase active:bg-zinc-800 transition-colors flex items-center justify-center"
            >
              {step === "PIN" ? "Back" : "Clear"}
            </button>
            <button
              onClick={() => handlePadPress("0")}
              className="h-16 rounded-xl bg-zinc-800 text-2xl font-black text-white active:bg-zinc-700 transition-colors flex items-center justify-center"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-16 rounded-xl bg-zinc-900 text-zinc-400 active:bg-zinc-800 transition-colors flex items-center justify-center"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full mt-6 h-16 rounded-xl bg-orange-600 text-white font-black text-lg uppercase tracking-wider active:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Loading..." : step === "PHONE" ? "Next" : "Login"}
            {!loading && step === "PIN" && <LogIn className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
