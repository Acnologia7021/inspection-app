"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Edit, Trash, Eye, X } from "lucide-react";

export default function DashboardPage() {
  const [houses, setHouses] = useState([]);
  const [newHouseName, setNewHouseName] = useState("");
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [newInspection, setNewInspection] = useState({
    room: "",
    status: "pending",
    remark: "",
    imageFile: null,
  });
  const [editingInspection, setEditingInspection] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHouses();
  }, []);

  useEffect(() => {
    if (selectedHouse) loadInspections(selectedHouse.id);
  }, [selectedHouse]);

  async function loadHouses() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("houses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setHouses(data || []);
    } catch (err) {
      console.error("Error loading houses:", err);
      alert("Failed to load houses");
    } finally {
      setLoading(false);
    }
  }

  async function loadInspections(houseId) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inspections")
        .select(`
          id,
          room,
          status,
          remark,
          created_at,
          inspection_images (
            id,
            image_url
          )
        `)
        .eq("house_id", houseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInspections(data || []);
    } catch (err) {
      console.error("Error loading inspections:", err);
      alert("Failed to load inspections");
    } finally {
      setLoading(false);
    }
  }

  async function addHouse() {
    if (!newHouseName.trim()) return alert("Enter a house name");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("houses")
        .insert([{ name: newHouseName.trim() }])
        .select();
      if (error) throw error;
      setHouses([...data, ...houses]);
      setNewHouseName("");
    } catch (err) {
      console.error(err);
      alert("Failed to add house");
    } finally {
      setLoading(false);
    }
  }

  async function deleteHouse(houseId) {
    if (!confirm("Are you sure?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("houses").delete().eq("id", houseId);
      if (error) throw error;
      setHouses(houses.filter(h => h.id !== houseId));
      if (selectedHouse?.id === houseId) {
        setSelectedHouse(null);
        setInspections([]);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete house");
    } finally {
      setLoading(false);
    }
  }

  async function addInspection() {
    if (!selectedHouse) return alert("Select a house first");
    if (!newInspection.room.trim()) return alert("Enter room name");
    setLoading(true);
    try {
      const { room, status, remark, imageFile } = newInspection;
      const { data: inspection, error } = await supabase
        .from("inspections")
        .insert([{ house_id: selectedHouse.id, room: room.trim(), status, remark: remark.trim() }])
        .select()
        .single();
      if (error) throw error;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `inspections/${inspection.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("inspection-images").upload(filePath, imageFile);
        if (!uploadError) {
          await supabase.from("inspection_images").insert([{ inspection_id: inspection.id, image_url: filePath }]);
        } else console.error(uploadError);
      }

      setNewInspection({ room: "", status: "pending", remark: "", imageFile: null });
      setPreviewImage(null);
      await loadInspections(selectedHouse.id);
    } catch (err) {
      console.error(err);
      alert("Failed to add inspection");
    } finally {
      setLoading(false);
    }
  }

  const startEditingInspection = (inspection) => {
    setEditingInspection({ ...inspection, imageFile: null });
    const existingImageUrl = inspection.inspection_images?.[0]?.image_url;
    if (existingImageUrl) {
      const { data } = supabase.storage.from("inspection-images").getPublicUrl(existingImageUrl);
      setPreviewImage(data.publicUrl);
    } else {
      setPreviewImage(null);
    }
  };

  async function updateInspection() {
    if (!editingInspection) return;
    setLoading(true);
    try {
      const { id, room, status, remark, imageFile } = editingInspection;
      const { error: updateError } = await supabase
        .from("inspections")
        .update({ room: room.trim(), status, remark: remark.trim() })
        .eq("id", id);
      if (updateError) throw updateError;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `inspections/${id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("inspection-images").upload(filePath, imageFile);
        if (!uploadError) {
          const { data: existingImage } = await supabase
            .from("inspection_images")
            .select("*")
            .eq("inspection_id", id)
            .single()
            .catch(() => ({ data: null }));
          if (existingImage) {
            await supabase.from("inspection_images").update({ image_url: filePath }).eq("inspection_id", id);
          } else {
            await supabase.from("inspection_images").insert([{ inspection_id: id, image_url: filePath }]);
          }
        } else console.error(uploadError);
      }

      setEditingInspection(null);
      setPreviewImage(null);
      await loadInspections(selectedHouse.id);
    } catch (err) {
      console.error(err);
      alert("Failed to update inspection");
    } finally {
      setLoading(false);
    }
  }

  async function deleteInspection(inspectionId) {
    if (!confirm("Are you sure?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("inspections").delete().eq("id", inspectionId);
      if (error) throw error;
      await loadInspections(selectedHouse.id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete inspection");
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(e, isEditing = false) {
    const file = e.target.files[0];
    if (isEditing) {
      setEditingInspection({ ...editingInspection, imageFile: file });
    } else {
      setNewInspection({ ...newInspection, imageFile: file });
    }
    setPreviewImage(file ? URL.createObjectURL(file) : null);
  }

  async function viewImage(imagePath) {
    try {
      const { data } = supabase.storage.from("inspection-images").getPublicUrl(imagePath);
      setViewingImage(data.publicUrl);
    } catch (err) {
      console.error("Error loading image:", err);
      alert("Failed to load image");
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "ongoing": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">House Inspection Dashboard</h1>

      {loading && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-4 rounded-lg">Loading...</div></div>}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full">
            <button onClick={() => setViewingImage(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <X size={24} />
            </button>
            <img src={viewingImage} alt="Inspection" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Houses Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Houses</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" value={newHouseName} onChange={(e) => setNewHouseName(e.target.value)} placeholder="Enter house name" className="flex-1 px-3 py-2 border rounded-lg" onKeyPress={(e) => e.key === 'Enter' && addHouse()} />
            <button onClick={addHouse} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"><Plus size={16}/>Add</button>
          </div>
          <div className="space-y-2">
            {houses.map((house) => (
              <div key={house.id} className={`p-3 border rounded-lg cursor-pointer flex items-center justify-between ${selectedHouse?.id === house.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`} onClick={() => setSelectedHouse(house)}>
                <span className="font-medium">{house.name}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteHouse(house.id); }} className="text-red-500 hover:text-red-700"><Trash size={16} /></button>
              </div>
            ))}
            {houses.length === 0 && <p className="text-gray-500 text-center py-4">No houses added yet</p>}
          </div>
        </div>

        {/* Inspections Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Inspections {selectedHouse && `- ${selectedHouse.name}`}</h2>

          {selectedHouse ? (
            <>
              {/* Add New Inspection */}
              {!editingInspection && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-3">Add New Inspection</h3>
                  <div className="space-y-3">
                    <input type="text" value={newInspection.room} onChange={(e) => setNewInspection({ ...newInspection, room: e.target.value })} placeholder="Room name" className="w-full px-3 py-2 border rounded-lg" />
                    <select value={newInspection.status} onChange={(e) => setNewInspection({ ...newInspection, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                    <textarea value={newInspection.remark} onChange={(e) => setNewInspection({ ...newInspection, remark: e.target.value })} placeholder="Remarks (optional)" className="w-full px-3 py-2 border rounded-lg" rows="2" />
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e)} className="w-full px-3 py-2 border rounded-lg" />
                    {previewImage && <div className="mt-2"><p className="text-sm text-gray-500">Preview:</p><img src={previewImage} alt="Preview" className="max-w-xs max-h-40 object-contain border rounded-lg mt-1" /></div>}
                    <button onClick={addInspection} className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"><Plus size={16}/>Add Inspection</button>
                  </div>
                </div>
              )}

              {/* Edit Inspection Form */}
              {editingInspection && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-3">Edit Inspection</h3>
                  <div className="space-y-3">
                    <input type="text" value={editingInspection.room} onChange={(e) => setEditingInspection({ ...editingInspection, room: e.target.value })} placeholder="Room name" className="w-full px-3 py-2 border rounded-lg" />
                    <select value={editingInspection.status} onChange={(e) => setEditingInspection({ ...editingInspection, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="pending">Pending</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                    <textarea value={editingInspection.remark} onChange={(e) => setEditingInspection({ ...editingInspection, remark: e.target.value })} placeholder="Remarks (optional)" className="w-full px-3 py-2 border rounded-lg" rows="2" />
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, true)} className="w-full px-3 py-2 border rounded-lg" />
                    {previewImage && <div className="mt-2"><p className="text-sm text-gray-500">Preview:</p><img src={previewImage} alt="Preview" className="max-w-xs max-h-40 object-contain border rounded-lg mt-1" /></div>}
                    <div className="flex gap-2">
                      <button onClick={updateInspection} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Update</button>
                      <button onClick={() => { setEditingInspection(null); setPreviewImage(null); }} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Inspections List */}
              <div className="space-y-3">
                {inspections.map((inspection) => (
                  <div key={inspection.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{inspection.room}</h4>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(inspection.status)}`}>{inspection.status}</span>
                      </div>
                      <div className="flex gap-2">
                        {inspection.inspection_images?.length > 0 && (
                          <button onClick={() => viewImage(inspection.inspection_images[0].image_url)} className="text-blue-500 hover:text-blue-700"><Eye size={16}/></button>
                        )}
                        <button onClick={() => startEditingInspection(inspection)} className="text-blue-500 hover:text-blue-700"><Edit size={16}/></button>
                        <button onClick={() => deleteInspection(inspection.id)} className="text-red-500 hover:text-red-700"><Trash size={16}/></button>
                      </div>
                    </div>
                    {inspection.remark && <p className="text-gray-600 text-sm mt-2">{inspection.remark}</p>}
                    <p className="text-gray-400 text-xs mt-2">{new Date(inspection.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
                {inspections.length === 0 && <p className="text-gray-500 text-center py-4">No inspections for this house yet</p>}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">Please select a house to view inspections</p>
          )}
        </div>
      </div>
    </div>
  );
}
