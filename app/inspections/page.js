"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AddInspection() {
  const [houses, setHouses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);

  useEffect(() => {
    async function loadHouses() {
      const { data } = await supabase.from("houses").select("*");
      setHouses(data || []);
    }
    loadHouses();
  }, []);

  useEffect(() => {
    if (selectedHouse) {
      async function loadRooms() {
        const { data } = await supabase.from("rooms").select("*").eq("house_id", selectedHouse);
        setRooms(data || []);
      }
      loadRooms();
    }
  }, [selectedHouse]);

  async function handleAddInspection(e) {
    e.preventDefault();
    const user = supabase.auth.getUser(); // get current user
    const { data: userData } = await user;
    const { data: inspection, error } = await supabase.from("inspections").insert({
      room_id: selectedRoom,
      inspector_id: userData?.user?.id,
      status,
      notes,
    }).select().single();

    if (error) {
      alert(error.message);
      return;
    }

    // Upload images
    for (let file of files) {
      const fileName = `${inspection.id}_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("inspection-images")
        .upload(fileName, file);
      if (!uploadError) {
        const { data: publicUrl } = supabase.storage
          .from("inspection-images")
          .getPublicUrl(fileName);
        await supabase.from("inspection_images").insert({
          inspection_id: inspection.id,
          url: publicUrl.publicUrl,
        });
      }
    }

    alert("Inspection added!");
    setSelectedHouse("");
    setSelectedRoom("");
    setStatus("Pending");
    setNotes("");
    setFiles([]);
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form onSubmit={handleAddInspection} className="bg-white p-6 rounded shadow w-96 space-y-4">
        <h1 className="text-xl font-bold">Add Inspection</h1>

        <select value={selectedHouse} onChange={(e) => setSelectedHouse(e.target.value)} className="w-full border p-2 rounded">
          <option value="">Select House</option>
          {houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}
        </select>

        <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} className="w-full border p-2 rounded">
          <option value="">Select Room</option>
          {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border p-2 rounded">
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </select>

        <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border p-2 rounded" />

        <input type="file" multiple capture="environment" onChange={(e) => setFiles([...e.target.files])} />

        <button className="w-full bg-blue-600 text-white p-2 rounded">Add Inspection</button>
      </form>
    </div>
  );
}
