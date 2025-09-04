"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AddRoom() {
  const router = useRouter();
  const [houseId, setHouseId] = useState("");
  const [name, setName] = useState("");
  const [houses, setHouses] = useState([]);

  useEffect(() => {
    const loadHouses = async () => {
      const { data, error } = await supabase.from("houses").select("*");
      if (error) console.error(error);
      else setHouses(data);
    };
    loadHouses();
  }, []);

  const handleAddRoom = async () => {
    if (!houseId || !name) return alert("Select house and enter room name");

    const { error } = await supabase.from("rooms").insert({ house_id: houseId, name });
    if (error) return alert(error.message);

    alert("Room added!");
    router.push("/dashboard");
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white p-6 rounded-xl shadow-lg w-80 space-y-4">
        <h1 className="text-xl font-bold text-center">Add Room</h1>
        <select value={houseId} onChange={(e) => setHouseId(e.target.value)} className="w-full border p-2 rounded">
          <option value="">Select House</option>
          {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <input type="text" placeholder="Room Name" className="w-full border p-2 rounded" onChange={(e) => setName(e.target.value)} />
        <button onClick={handleAddRoom} className="w-full bg-green-600 text-white p-2 rounded">Add Room</button>
      </div>
    </div>
  );
}
