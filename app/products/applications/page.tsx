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
  Briefcase,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
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

const WEBSITE_OPTIONS = ["Disruptive Solutions Inc.", "Ecoshift Corporation", "VAH"];

export default function ApplicationsPage() {
  const CLOUDINARY_UPLOAD_PRESET = "taskflow_preset"; 
  const CLOUDINARY_CLOUD_NAME = "dvmpn8mjh";

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Form States
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // --- 1. FETCH DATA (REAL-TIME) ---
  useEffect(() => {
    const q = query(collection(db, "applications"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(list);
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

  const handleEditClick = (app: any) => {
    setEditId(app.id);
    setTitle(app.title);
    setDescription(app.description);
    setSelectedWebsites(app.websites || []);
    setPreviewUrl(app.imageUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- 3. SUBMIT LOGIC ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error("Please enter an application title");
    if (selectedWebsites.length === 0) return toast.error("Select at least one website");
    
    setIsSubmitLoading(true);
    const loadingToast = toast.loading(editId ? "Updating sector..." : "Creating sector...");

    try {
      let finalImageUrl = previewUrl;
      if (imageFile) {
        finalImageUrl = await uploadToCloudinary(imageFile);
      }

      const applicationData: any = {
        title: title.toUpperCase(),
        description,
        websites: selectedWebsites,
        imageUrl: finalImageUrl,
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        await updateDoc(doc(db, "applications", editId), applicationData);
        toast.success("Sector updated!", { id: loadingToast });
      } else {
        await addDoc(collection(db, "applications"), {
          ...applicationData,
          isActive: true, 
          createdAt: serverTimestamp(),
        });
        toast.success("New sector added!", { id: loadingToast });
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
      await updateDoc(doc(db, "applications", id), { isActive: !currentStatus });
      toast.success(!currentStatus ? "Visible" : "Hidden");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    const deleteToast = toast.loading("Removing sector...");
    try {
      await deleteDoc(doc(db, "applications", id));
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
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-100">
            <Briefcase className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Application Maintenance</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sector & Solution Classification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* --- FORM COLUMN --- */}
          <div className="lg:col-span-4">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">
                  {editId ? "✏️ Edit Sector" : "🏗️ New Sector"}
                </h2>
                {editId && <Button onClick={resetForm} variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase">Cancel</Button>}
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Sector Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. INDUSTRIAL FACILITIES" className="rounded-2xl h-12 font-bold" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Sector Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe environment..." className="rounded-2xl min-h-[80px] text-xs font-medium" />
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
                          isActive ? "border-emerald-600 bg-emerald-50/30" : "border-slate-50 bg-slate-50/50 hover:border-slate-200"
                        )}
                      >
                        <span className={cn("text-[10px] font-black uppercase italic", isActive ? "text-emerald-900" : "text-slate-400")}>{site}</span>
                        {isActive && <Check size={14} className="text-emerald-600" strokeWidth={4} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Sector Image</label>
                <div onClick={() => document.getElementById('app-img')?.click()} className="relative w-full h-32 bg-slate-50 rounded-[20px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors">
                  {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <div className="text-slate-300 flex flex-col items-center"><ImageIcon size={24}/><span className="text-[8px] font-black uppercase mt-2">Upload Preview</span></div>}
                  <input type="file" id="app-img" hidden onChange={handleImageChange} accept="image/*" />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitLoading} className="w-full bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] h-14 shadow-lg shadow-slate-200">
                {isSubmitLoading ? <Loader2 className="animate-spin" /> : editId ? "Update Sector" : "Save Sector"}
              </Button>
            </form>
          </div>

          {/* --- LIST COLUMN --- */}
          <div className="lg:col-span-8">
            {loading ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div> : (
              <div className="space-y-4">
                {applications.length === 0 && (
                  <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-[40px]">
                    <p className="text-slate-300 font-bold uppercase text-xs tracking-widest">No Applications Setup Yet</p>
                  </div>
                )}
                {applications.map((app) => (
                  <div key={app.id} className={`group bg-white border border-slate-100 rounded-[32px] p-4 flex flex-col md:flex-row items-center gap-6 transition-all duration-500 hover:shadow-xl hover:shadow-slate-50 ${app.isActive === false ? 'opacity-60 grayscale' : ''}`}>
                    <div className="w-full md:w-40 h-28 bg-slate-100 rounded-[24px] overflow-hidden relative shrink-0">
                      <img src={app.imageUrl || "https://via.placeholder.com/400x300"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">{app.title}</h3>
                        <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${app.isActive !== false ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {app.isActive !== false ? "Active" : "Hidden"}
                        </div>
                      </div>

                      {/* Website Badges */}
                      <div className="flex flex-wrap justify-center md:justify-start gap-1">
                        {app.websites?.map((site: string) => (
                          <span key={site} className="text-[7px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded border border-slate-100">
                            {site}
                          </span>
                        ))}
                      </div>

                      <p className="text-[10px] text-slate-400 font-bold uppercase line-clamp-1 leading-tight max-w-xl italic opacity-70">
                        {app.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button onClick={() => handleEditClick(app)} variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-100 hover:bg-slate-50"><Pencil size={16} /></Button>
                      <button 
                        onClick={() => toggleVisibility(app.id, app.isActive)}
                        className={`h-10 w-10 flex items-center justify-center rounded-xl border border-slate-100 transition-all ${app.isActive !== false ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-300 hover:bg-slate-100'}`}
                      >
                        {app.isActive !== false ? <Eye size={16}/> : <EyeOff size={16}/>}
                      </button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-100 text-red-500 hover:bg-red-50"><Trash2 size={16} /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[32px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2"> <AlertCircle className="text-red-500"/> Confirm Delete</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest leading-relaxed">Delete application "{app.title}"? This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-4 gap-2">
                            <AlertDialogCancel className="rounded-2xl bg-slate-100 border-none font-black text-[10px] uppercase h-12 px-6">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(app.id)} className="rounded-2xl bg-red-600 hover:bg-red-700 font-black text-[10px] uppercase h-12 px-6">Confirm Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}