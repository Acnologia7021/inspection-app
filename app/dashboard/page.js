"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [houses, setHouses] = useState([]);

  // Modal states
  const [houseModalOpen, setHouseModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);

  // Form states
  const [newHouseName, setNewHouseName] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedHouseForRoom, setSelectedHouseForRoom] = useState("");
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");
      setUser(session.user);
      setLoading(false);
      loadHouses();
    };

    checkUser();
  }, [router]);

  const loadHouses = async () => {
    const { data: housesData, error: housesError } = await supabase.from("houses").select("*");
    if (housesError) {
      console.error("Error loading houses:", housesError);
      alert("Failed to load houses. Check console.");
      return;
    }

    const housesWithRooms = await Promise.all(
      housesData.map(async (house) => {
        const { data: roomsData, error: roomsError } = await supabase.from("rooms").select("*").eq("house_id", house.id);
        if (roomsError) return { ...house, rooms: [] };

        const roomsWithInspections = await Promise.all(
          roomsData.map(async (room) => {
            const { data: inspectionsData, error: inspError } = await supabase
              .from("inspections")
              .select(`*, inspection_images(url)`)
              .eq("room_id", room.id)
              .eq("inspector_id", user?.id);
            if (inspError) return { ...room, inspections: [] };
            return { ...room, inspections: inspectionsData || [] };
          })
        );

        return { ...house, rooms: roomsWithInspections };
      })
    );

    setHouses(housesWithRooms);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleAddHouse = async () => {
    if (!newHouseName) return alert("Enter house name");
    const { error } = await supabase.from("houses").insert({ name: newHouseName });
    if (error) return alert(error.message);
    setNewHouseName("");
    setHouseModalOpen(false);
    loadHouses();
  };

  const handleAddRoom = async () => {
    if (!selectedHouseForRoom || !newRoomName) return alert("Select house and enter room name");
    const { error } = await supabase.from("rooms").insert({ house_id: selectedHouseForRoom, name: newRoomName });
    if (error) return alert(error.message);
    setNewRoomName("");
    setSelectedHouseForRoom("");
    setRoomModalOpen(false);
    loadHouses();
  };

  const handleSaveInspection = async () => {
    if (!selectedHouseId || !selectedRoomId) return alert("Select house and room");

    const { data: inspection, error: inspError } = await supabase
      .from("inspections")
      .insert({ room_id: selectedRoomId, inspector_id: user.id, status, notes })
      .select()
      .single();

    if (inspError) return alert("Failed to save inspection: " + inspError.message);

    for (let file of files) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error: uploadError } = await supabase.storage.from("inspection-images").upload(fileName, file);
      if (uploadError) console.error("Upload error:", uploadError);
      else {
        const url = supabase.storage.from("inspection-images").getPublicUrl(fileName).data.publicUrl;
        await supabase.from("inspection_images").insert({ inspection_id: inspection.id, url });
      }
    }

    setInspectionModalOpen(false);
    setSelectedHouseId("");
    setSelectedRoomId("");
    setStatus("Pending");
    setNotes("");
    setFiles([]);
    loadHouses();
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div>
            <button onClick={handleSignOut} className="bg-red-500 text-white px-4 py-2 rounded mr-2">Sign Out</button>
            <button onClick={() => setHouseModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded mr-2">Add House</button>
            <button onClick={() => setRoomModalOpen(true)} className="bg-yellow-600 text-white px-4 py-2 rounded mr-2">Add Room</button>
            <button onClick={() => setInspectionModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded">Add Inspection</button>
          </div>
        </div>

        {/* Houses List */}
        {houses.length === 0 ? (
          <p>No houses yet. Add some!</p>
        ) : (
          houses.map((house) => (
            <div key={house.id} className="bg-white p-4 rounded mb-4 shadow">
              <h2 className="font-bold text-lg">{house.name}</h2>
              {house.rooms.length === 0 ? (
                <p className="ml-4 text-gray-500">No rooms yet.</p>
              ) : (
                house.rooms.map((room) => (
                  <div key={room.id} className="ml-4 mt-2">
                    <h3 className="font-semibold">{room.name}</h3>
                    {room.inspections.length === 0 ? (
                      <p className="ml-2 text-sm text-gray-500">No inspections yet.</p>
                    ) : (
                      room.inspections.map((insp) => (
                        <div key={insp.id} className="ml-2 text-sm border-b py-1">
                          <p>Status: {insp.status}</p>
                          <p>Notes: {insp.notes}</p>
                          {insp.inspection_images?.map((img, i) => (
                            <img key={i} src={img.url} className="w-20 h-20 mt-1 rounded" alt="inspection" />
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                ))
              )}
            </div>
          ))
        )}

        {/* Add House Modal */}
        {houseModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96 space-y-4">
              <h2 className="text-xl font-bold">Add House</h2>
              <input
                type="text"
                placeholder="House Name"
                className="w-full border p-2 rounded"
                value={newHouseName}
                onChange={(e) => setNewHouseName(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setHouseModalOpen(false)}>Cancel</button>
                <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleAddHouse}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Room Modal */}
        {roomModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96 space-y-4">
              <h2 className="text-xl font-bold">Add Room</h2>
              <select className="w-full border p-2 rounded" value={selectedHouseForRoom} onChange={(e) => setSelectedHouseForRoom(e.target.value)}>
                <option value="">Select House</option>
                {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="Room Name"
                className="w-full border p-2 rounded"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setRoomModalOpen(false)}>Cancel</button>
                <button className="bg-yellow-600 text-white px-4 py-2 rounded" onClick={handleAddRoom}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Inspection Modal */}
        {inspectionModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96 space-y-2">
              <h2 className="text-xl font-bold mb-2">Add Inspection</h2>

              <select value={selectedHouseId} onChange={(e) => setSelectedHouseId(e.target.value)} className="w-full border p-2 rounded mb-2">
                <option value="">Select House</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>

              <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className="w-full border p-2 rounded mb-2">
                <option value="">Select Room</option>
                {houses.find((h) => h.id === selectedHouseId)?.rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border p-2 rounded mb-2">
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>

              <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border p-2 rounded mb-2" />

              <input type="file" multiple capture="environment" onChange={(e) => setFiles([...e.target.files])} className="mb-2" />

              <div className="flex justify-end gap-2 mt-4">
                <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setInspectionModalOpen(false)}>Cancel</button>
                <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSaveInspection}>Save</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
