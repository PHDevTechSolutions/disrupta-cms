"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy 
} from "firebase/firestore";
import { 
  Pencil, 
  Trash2, 
  Image as ImageIcon, 
  Loader2, 
  X, 
  LayoutGrid,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Check
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/sidebar/page-wrapper";
import { cn } from "@/lib/utils";

const WEBSITE_OPTIONS = ["Disruptive Solutions Inc", "Ecoshift Corporation", "Value Acquisitions Holdings"];

export default function CategoryMaintenance() {
  const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset"; 
  const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh";

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Form States
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const q = query(collection(db, "categoriesmaintenance"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. HELPERS ---
  const toggleWebsite = (website: string) => {
    setSelectedWebsites((prev) =>
      prev.includes(website) ? prev.filter((w) => w !== website) : [...prev, website]
    );
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { 
      method: "POST", 
      body: formData 
    });
    const data = await res.json();
    return data.secure_url;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setDescription("");
    setSelectedWebsites([]);
    setImageFile(null);
    setPreviewUrl("");
  };

  const handleEditClick = (cat: any) => {
    setEditId(cat.id);
    setTitle(cat.title);
    setDescription(cat.description);
    setSelectedWebsites(cat.websites || []);
    setPreviewUrl(cat.imageUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- 3. SUBMIT LOGIC ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error("Please enter a category title");
    if (selectedWebsites.length === 0) return toast.error("Select at least one website");
    
    setIsSubmitLoading(true);
    const loadingToast = toast.loading(editId ? "Updating category..." : "Creating category...");

    try {
      let finalImageUrl = previewUrl;
      if (imageFile) {
        finalImageUrl = await uploadToCloudinary(imageFile);
      }

      const categoryData: any = {
        title: title.toUpperCase(),
        description,
        websites: selectedWebsites,
        imageUrl: finalImageUrl,
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        await updateDoc(doc(db, "categoriesmaintenance", editId), categoryData);
        toast.success("Category updated!", { id: loadingToast });
      } else {
        await addDoc(collection(db, "categoriesmaintenance"), {
          ...categoryData,
          isActive: true, 
          createdAt: serverTimestamp(),
        });
        toast.success("New category added!", { id: loadingToast });
      }
      resetForm();
    } catch (error) {
      toast.error("Process failed.", { id: loadingToast });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const toggleVisibility = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "categoriesmaintenance", id), { isActive: !currentStatus });
      toast.success(!currentStatus ? "Visible" : "Hidden");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    const deleteToast = toast.loading("Removing category...");
    try {
      await deleteDoc(doc(db, "categoriesmaintenance", id));
      toast.success("Deleted permanently", { id: deleteToast });
    } catch (error) {
      toast.error("Failed to delete", { id: deleteToast });
    }
  };

  return (
    <PageWrapper>
      <div className="p-4 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100">
            <LayoutGrid className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Category Maintenance</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Platform Visibility & Classification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* --- FORM COLUMN --- */}
          <div className="lg:col-span-4">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase text-blue-600 tracking-widest">
                  {editId ? "✏️ Edit Category" : "✨ New Category"}
                </h2>
                {editId && <Button onClick={resetForm} variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase">Cancel</Button>}
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Category Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HIGH BAY LIGHTS" className="rounded-2xl h-12 font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief overview..." className="rounded-2xl min-h-[80px] text-xs font-medium" />
              </div>

              {/* Website Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                  <Globe size={12}/> Assign to Website
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {WEBSITE_OPTIONS.map((site) => {
                    const isActive = selectedWebsites.includes(site);
                    return (
                      <div
                        key={site}
                        onClick={() => toggleWebsite(site)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
                          isActive ? "border-blue-600 bg-blue-50/30" : "border-slate-50 bg-slate-50/50 hover:border-slate-200"
                        )}
                      >
                        <span className={cn("text-[10px] font-black uppercase italic", isActive ? "text-blue-900" : "text-slate-400")}>{site}</span>
                        {isActive && <Check size={14} className="text-blue-600" strokeWidth={4} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Media Preview</label>
                <div onClick={() => document.getElementById('cat-img')?.click()} className="relative w-full h-32 bg-slate-50 rounded-[20px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors">
                  {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <div className="text-slate-300 flex flex-col items-center"><ImageIcon size={24}/><span className="text-[8px] font-black uppercase mt-2">Upload Cover</span></div>}
                  <input type="file" id="cat-img" hidden onChange={handleImageChange} accept="image/*" />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitLoading} className="w-full bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] h-14 shadow-lg shadow-slate-200">
                {isSubmitLoading ? <Loader2 className="animate-spin" /> : editId ? "Update Category" : "Save Category"}
              </Button>
            </form>
          </div>

          {/* --- GRID LIST COLUMN --- */}
          <div className="lg:col-span-8">
            {loading ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {categories.map((cat) => (
                  <div key={cat.id} className={`group bg-white border border-slate-100 rounded-[32px] overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-slate-100 ${cat.isActive === false ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className="h-44 bg-slate-100 overflow-hidden relative">
                      <img src={cat.imageUrl || "https://via.placeholder.com/400x300"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      
                      {/* Status Label */}
                      <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[8px] font-black uppercase flex items-center gap-1 shadow-lg ${cat.isActive !== false ? 'bg-green-500 text-white' : 'bg-slate-800 text-white'}`}>
                        {cat.isActive !== false ? <><Eye size={10}/> Active</> : <><EyeOff size={10}/> Hidden</>}
                      </div>

                      {/* Floating Actions */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button onClick={() => handleEditClick(cat)} size="icon" className="bg-white text-slate-900 rounded-xl h-11 w-11 hover:bg-blue-600 hover:text-white transition-all"><Pencil size={18} /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" className="bg-white text-red-600 rounded-xl h-11 w-11 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18} /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[32px]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2"> <AlertCircle className="text-red-500"/> Danger Zone</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest leading-relaxed">Delete {cat.title}? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4 gap-2">
                              <AlertDialogCancel className="rounded-2xl bg-slate-100 border-none font-black text-[10px] uppercase h-12">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(cat.id)} className="rounded-2xl bg-red-600 hover:bg-red-700 font-black text-[10px] uppercase h-12">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="p-6 space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">{cat.title}</h3>
                        <button 
                          onClick={() => toggleVisibility(cat.id, cat.isActive)}
                          className={`text-[8px] font-black uppercase px-2 py-1 rounded transition-all ${cat.isActive !== false ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                          {cat.isActive !== false ? "Hide" : "Show"}
                        </button>
                      </div>

                      {/* Website Badges */}
                      <div className="flex flex-wrap gap-1">
                        {cat.websites?.map((site: string) => (
                          <span key={site} className="text-[7px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                            {site}
                          </span>
                        ))}
                      </div>

                      <p className="text-[10px] text-slate-400 font-bold uppercase line-clamp-1 opacity-70 italic">
                        {cat.description || "No description provided."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {categories.length === 0 && !loading && (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[32px]">
                <LayoutGrid className="text-slate-100 mb-2" size={48} />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No categories found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}