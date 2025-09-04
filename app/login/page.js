"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  async function handleAuth(e) {
    e.preventDefault();
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Check your email to confirm your account.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else router.push("/dashboard");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleAuth} className="bg-white p-6 rounded-xl shadow-lg w-80 space-y-4">
        <h1 className="text-xl font-bold text-center">{isSignup ? "Sign Up" : "Login"}</h1>
        <input type="email" placeholder="Email" className="w-full border p-2 rounded" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full border p-2 rounded" onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">{isSignup ? "Sign Up" : "Login"}</button>
        <p className="text-sm text-center text-blue-500 cursor-pointer" onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? "Already have an account? Login" : "New here? Sign Up"}
        </p>
      </form>
    </div>
  );
}
