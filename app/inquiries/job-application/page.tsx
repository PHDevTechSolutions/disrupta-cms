"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    doc, 
    deleteDoc,
    updateDoc 
} from "firebase/firestore";
import { 
    Mail, 
    Phone, 
    FileText, 
    Calendar, 
    Briefcase, 
    Trash2, 
    ExternalLink,
    Search,
    User,
    CheckCircle,
    Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ApplicationInquiriesPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // --- REAL-TIME FETCH ---
    useEffect(() => {
        const q = query(collection(db, "applications"), orderBy("appliedAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const appList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setApplications(appList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // --- DELETE FUNCTION ---
    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this application?")) {
            try {
                await deleteDoc(doc(db, "applications", id));
            } catch (error) {
                console.error("Error deleting:", error);
            }
        }
    };

    // --- UPDATE STATUS ---
    const toggleStatus = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === "pending" ? "reviewed" : "pending";
        try {
            await updateDoc(doc(db, "applications", id), { status: nextStatus });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const filteredApps = applications.filter(app => 
        app.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-widest text-xs">
            <Clock className="animate-spin mr-2" size={16} /> Loading Applications...
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Job Applications</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Manage incoming resumes and candidates</p>
                </div>
                
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d11a2a] transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search candidates..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-[#d11a2a]/10 outline-none font-medium text-sm transition-all"
                    />
                </div>
            </div>

            {/* Applications List */}
            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                    {filteredApps.map((app) => (
                        <motion.div
                            key={app.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white border border-gray-100 p-6 rounded-[2rem] hover:shadow-xl hover:shadow-gray-200/40 transition-all group"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                
                                {/* Candidate Info */}
                                <div className="flex items-start gap-5">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-red-50 transition-colors">
                                        <User className="text-gray-400 group-hover:text-[#d11a2a]" size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-gray-900 leading-none">{app.fullName}</h3>
                                        <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            <span className="flex items-center gap-1 text-[#d11a2a]">
                                                <Briefcase size={12} /> {app.jobTitle}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} /> {app.appliedAt?.toDate().toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Mail size={14} /></div>
                                        <span className="text-sm font-bold text-gray-600 lowercase">{app.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Phone size={14} /></div>
                                        <span className="text-sm font-bold text-gray-600">{app.phone}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-50">
                                    {/* Resume Link */}
                                    <a 
                                        href={app.resumeUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#d11a2a] transition-all"
                                    >
                                        <FileText size={14} /> View CV <ExternalLink size={12} />
                                    </a>

                                    {/* Status Toggle */}
                                    <button 
                                        onClick={() => toggleStatus(app.id, app.status)}
                                        className={`p-3 rounded-xl transition-all ${
                                            app.status === "reviewed" 
                                            ? "bg-green-100 text-green-600" 
                                            : "bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500"
                                        }`}
                                        title="Mark as Reviewed"
                                    >
                                        <CheckCircle size={18} />
                                    </button>

                                    {/* Delete */}
                                    <button 
                                        onClick={() => handleDelete(app.id)}
                                        className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredApps.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
                        <p className="text-xs font-black text-gray-300 uppercase tracking-[0.3em]">No applications found</p>
                    </div>
                )}
            </div>
        </div>
    );
}