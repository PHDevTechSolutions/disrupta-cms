"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { 
  ImageIcon,
  Pencil,
  Trash2,
  Loader2,
  Search,
} from "lucide-react";

// ShadCN UI components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Firebase
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

// Sidebar
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function AllProductsPage() {
  // --- STATES ---
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("All Brands");

  // Edit States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- DELETE ---
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product");
    }
  };

  // --- EDIT ---
  const handleEditClick = (product: any) => {
    setEditingProduct(JSON.parse(JSON.stringify(product)));
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    setIsUpdating(true);
    try {
      const productRef = doc(db, "products", editingProduct.id);
      const { id, ...dataToUpdate } = editingProduct;
      await updateDoc(productRef, dataToUpdate);
      toast.success("Updated successfully!");
      setIsEditOpen(false);
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSpecChange = (blockId: string, newValue: string) => {
    const updatedBlocks = editingProduct.descriptionBlocks.map((block: any) =>
      block.id === blockId ? { ...block, value: newValue } : block
    );
    setEditingProduct({ ...editingProduct, descriptionBlocks: updatedBlocks });
  };

  // --- FILTERED PRODUCTS ---
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesBrand =
        brandFilter === "All Brands" ||
        (Array.isArray(p.brands) ? p.brands.includes(brandFilter) : p.brands === brandFilter);
      const matchesSearch =
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBrand && matchesSearch;
    });
  }, [products, brandFilter, searchQuery]);

  const uniqueBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach((p: any) => {
      if (Array.isArray(p.brands)) p.brands.forEach((b: string) => brandsSet.add(b));
      else if (p.brands) brandsSet.add(p.brands);
    });
    return Array.from(brandsSet);
  }, [products]);

  // --- RENDER ---
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      {/* --- Sidebar --- */}
      <AppSidebar
        variant="inset"
        onNavigate={(view: string) => {
          console.log("Navigated to:", view);
        }}
      />

      <SidebarInset>
        <div className="flex flex-1 flex-col space-y-4 p-2">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900">
                Inventory
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Manage your product database
              </p>
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Search products..."
                className="pl-10 rounded-xl border-gray-100 bg-gray-50/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="border rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gray-50/50 border-gray-100 outline-none"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option>All Brands</option>
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          {/* TABLE */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="w-[40px] px-6"><Checkbox /></TableHead>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Product Details</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">SKU</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Brands</TableHead>
                  <TableHead className="text-right px-6 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <Loader2 className="animate-spin mx-auto text-red-500" />
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-xs text-gray-400 font-bold uppercase">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="group hover:bg-gray-50/50 transition-colors">
                      <TableCell className="px-6"><Checkbox /></TableCell>
                      <TableCell>
                        <div className="w-12 h-12 bg-gray-50 rounded-xl p-1 border border-gray-100">
                          <img src={product.mainImage} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-gray-900 line-clamp-1">{product.name}</span>
                          <span className="text-[10px] text-blue-600 font-bold uppercase">{product.categories?.[0] || "No Category"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] font-black text-gray-400 uppercase">{product.sku}</TableCell>
                      <TableCell>
                        <span className="text-[9px] font-black bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">
                          {Array.isArray(product.brands) ? product.brands[0] : product.brands}
                        </span>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleEditClick(product)}>
                            <Pencil size={14} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 size={14} /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-black uppercase italic tracking-tighter">Delete Product?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs">Permanent deletion of {product.name}.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl border-none bg-gray-100 font-bold text-[10px] uppercase">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(product.id)} className="rounded-xl bg-red-600 font-bold text-[10px] uppercase">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* --- EDIT SHEET --- */}
          <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
            <SheetContent className="sm:max-w-[600px] overflow-y-auto rounded-l-[40px] border-none shadow-2xl">
              <SheetHeader className="pb-6 border-b">
                <SheetTitle className="text-3xl font-black uppercase italic tracking-tighter">Edit Product</SheetTitle>
                <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Update specification and meta data</SheetDescription>
              </SheetHeader>

              {editingProduct && (
                <div className="space-y-8 py-8">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Product Name</Label>
                      <Input value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="rounded-2xl py-6" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">SKU</Label>
                        <Input value={editingProduct.sku} onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})} className="rounded-2xl py-6" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Main Image URL</Label>
                        <Input value={editingProduct.mainImage} onChange={(e) => setEditingProduct({...editingProduct, mainImage: e.target.value})} className="rounded-2xl py-6" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase italic text-red-600 border-b pb-2">Technical Blocks</h3>
                    {editingProduct.descriptionBlocks?.map((block: any) => (
                      <div key={block.id} className="p-5 bg-gray-50 rounded-[25px] border border-gray-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-black uppercase text-gray-500">{block.label}</Label>
                        </div>
                        <textarea 
                          className="w-full min-h-[120px] p-4 text-sm rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-4 ring-red-50 transition-all font-medium leading-relaxed"
                          value={block.value}
                          onChange={(e) => handleSpecChange(block.id, e.target.value)}
                        />
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Format: Label: Value</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <SheetFooter className="pt-6 border-t mt-4">
                <Button disabled={isUpdating} onClick={handleUpdate} className="w-full bg-[#d11a2a] hover:bg-red-700 text-white rounded-2xl py-8 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-red-500/20 transition-all active:scale-95">
                  {isUpdating ? <Loader2 className="animate-spin" /> : "Commit Changes"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
