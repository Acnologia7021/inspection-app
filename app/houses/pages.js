"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AddHouse() {
  const router = useRouter();
  const [name, setName] = useState("");

  const handleAddHouse = async () => {
    if (!name) return alert("Enter house name");

    const { error } = await supabase.from("houses").insert({ name });
    if (error) return alert(error.message);

    alert("House added!");
    router.push("/dashboard");
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white p-6 rounded-xl shadow-lg w-80 space-y-4">
        <h1 className="text-xl font-bold text-center">Add House</h1>
        <input
          type="text"
          placeholder="House Name"
          className="w-full border p-2 rounded"
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={handleAddHouse}
          className="w-full bg-green-600 text-white p-2 rounded"
        >
          Add House
        </button>
      </div>
    </div>
  );
}
