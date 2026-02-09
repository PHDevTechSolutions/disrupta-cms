"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import {
  Pencil,
  Trash2,
  Loader2,
  Search,
  ArrowLeft,
  PlusCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Upload,
} from "lucide-react";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Firebase
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { PageWrapper } from "@/components/sidebar/page-wrapper";

// SIGURADUHIN NA CAPITAL 'N' ANG FILENAME SA SIDEBAR MO
import AddNewProduct from "@/components/products/taskflow-add-product-form";
import { BulkUploadSection } from "@/components/products/bulk-upload";

export default function TaskflowProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States - No website filter needed (only taskflow)
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("All Brands");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [itemsPerPageInput, setItemsPerPageInput] = useState("10");

  // View States
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Bulk Upload & Selection
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const productList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productList);
        setLoading(false);
      },
      (error) => {
        console.error("Fetch error:", error);
        toast.error("Failed to load products");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // --- 2. FILTER LOGIC - Always filters for taskflow ---
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesBrand =
        brandFilter === "All Brands" ||
        (Array.isArray(p.brands)
          ? p.brands.includes(brandFilter)
          : p.brand === brandFilter);
      
      // Always filter for taskflow website
      const matchesTaskflow =
        Array.isArray(p.websites)
          ? p.websites.some((w: string) => 
              w?.toLowerCase().includes("taskflow")
            )
          : p.website?.toLowerCase().includes("taskflow");
      
      const matchesSearch =
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.itemCode?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesBrand && matchesTaskflow && matchesSearch;
    });
  }, [products, brandFilter, searchQuery]);

  // --- 3. PAGINATION LOGIC ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, brandFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const uniqueBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach((p: any) => {
      if (Array.isArray(p.brands))
        p.brands.forEach((b: string) => brandsSet.add(b));
      else if (p.brand) brandsSet.add(p.brand);
    });
    return Array.from(brandsSet).sort();
  }, [products]);

  const uniqueWebsites = useMemo(() => {
    const websSet = new Set<string>();

    products.forEach((p: any) => {
      if (Array.isArray(p.websites)) {
        p.websites.forEach((w: any) => {
          if (w != null) websSet.add(String(w).trim());
        });
      } else if (p.website != null) {
        websSet.add(String(p.website).trim());
      }
    });

    return Array.from(websSet).sort();
  }, [products]);

  // --- 4. ACTIONS ---
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "products", id));
      toast.success("Product deleted successfully");
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleEditClick = (product: any) => {
    setSelectedProduct(product);
    setIsEditing(true);
  };

  const handleAddNewClick = () => {
    setSelectedProduct(null);
    setIsEditing(true);
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
    setIsEditing(false);
  };

  // --- SELECTION HANDLERS ---
  const toggleSelectProduct = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(productId)) newSelected.delete(productId);
    else newSelected.add(productId);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length)
      setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedProducts.map((p) => p.id)));
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map((id) =>
        deleteDoc(doc(db, "products", id)),
      );
      await Promise.all(deletePromises);
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      toast.success(`Deleted ${selectedIds.size} product(s)`);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Failed to delete products");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setItemsPerPageInput(val);
    if (val !== "") {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) {
        setItemsPerPage(num);
        setCurrentPage(1);
      }
    }
  };

  const handleItemsPerPageBlur = () => {
    if (itemsPerPageInput === "" || parseInt(itemsPerPageInput) <= 0) {
      setItemsPerPageInput(itemsPerPage.toString());
    }
  };

  const getPaginationPages = () => {
    const maxButtons = 5;
    if (totalPages <= maxButtons)
      return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: number[] = [];
    const leftSide = Math.floor(maxButtons / 2);
    const rightSide = maxButtons - leftSide - 1;

    let startPage = Math.max(1, currentPage - leftSide);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1)
      startPage = Math.max(1, endPage - maxButtons + 1);

    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  // --- RENDER CONDITION ---
  if (isEditing) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBackToList}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600"
            >
              <ArrowLeft size={16} /> Back to Taskflow Inventory
            </Button>
            <div className="h-4 w-[1px] bg-slate-200" />
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              {selectedProduct
                ? `Editing: ${selectedProduct?.name}`
                : "Adding New Product"}
            </p>
          </div>
        </div>
        <AddNewProduct
          editData={selectedProduct}
          onFinished={handleBackToList}
        />
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="w-full space-y-4 p-2 animate-in fade-in duration-500">
        {/* HEADER */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900 flex items-center gap-2">
              <Package className="text-blue-600" size={28} /> Taskflow Inventory
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Manage products for Taskflow website
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleAddNewClick}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 font-black uppercase text-[10px] tracking-widest h-12 shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              <PlusCircle className="mr-2 w-4 h-4" /> Add Product
            </Button>
            <Button
              onClick={() => setIsBulkUploadOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white rounded-2xl px-6 font-black uppercase text-[10px] tracking-widest h-12 shadow-lg shadow-green-100 transition-all active:scale-95"
            >
              <Upload className="mr-2 w-4 h-4" /> Bulk Upload
            </Button>
            {selectedIds.size > 0 && (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-2xl px-6 font-black uppercase text-[10px] tracking-widest h-12 shadow-lg shadow-red-100 transition-all active:scale-95"
              >
                <Trash2 className="mr-2 w-4 h-4" /> Delete {selectedIds.size}
              </Button>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <Input
              placeholder="Search name or Item Code..."
              className="pl-10 rounded-xl border-gray-100 bg-gray-50/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="border rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gray-50/50 border-gray-100 outline-none cursor-pointer"
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
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-12 pl-6 py-4">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === paginatedProducts.length &&
                      paginatedProducts.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded-md"
                  />
                </TableHead>
                <TableHead className="w-[80px] pl-2 py-4">Image</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">
                  Product Info
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">
                  Item Code
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">
                  Brand / Web
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-60 text-center">
                    <Loader2
                      className="animate-spin mx-auto text-blue-500"
                      size={32}
                    />
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-60 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]"
                  >
                    No taskflow products found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className={`group hover:bg-blue-50/30 transition-all border-b border-gray-50 ${
                      selectedIds.has(product.id) ? "bg-blue-50/50" : ""
                    } cursor-pointer`}
                    onClick={() => handleEditClick(product)}
                  >
                    {/* CHECKBOX */}
                    <TableCell
                      className="pl-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelectProduct(product.id)}
                        className="rounded-md"
                      />
                    </TableCell>

                    {/* MAIN IMAGE */}
                    <TableCell className="pl-2 py-4">
                      <div className="w-14 h-14 bg-white rounded-2xl p-1 border border-gray-100 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                        <img
                          src={product.mainImage || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </TableCell>

                    {/* PRODUCT INFO */}
                    <TableCell>
                      <div className="flex flex-col max-w-[250px]">
                        <span className="font-black text-sm text-gray-900 line-clamp-1">
                          {product.name}
                        </span>
                        <span className="text-[9px] text-blue-600 font-black uppercase tracking-tighter">
                          {product.categories || "No Category"}
                        </span>
                      </div>
                    </TableCell>

                    {/* ITEM CODE */}
                    <TableCell className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                      {product.itemCode || "---"}
                    </TableCell>

                    {/* BRAND / WEBSITE */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="w-fit text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">
                          {Array.isArray(product.brands)
                            ? product.brands.join(", ")
                            : product.brand || "Generic"}
                        </span>
                        <span className="w-fit text-[8px] font-black bg-blue-50 px-2 py-0.5 rounded text-blue-500 uppercase">
                          {Array.isArray(product.websites)
                            ? product.websites.join(", ")
                            : product.website || "N/A"}
                        </span>
                      </div>
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:bg-blue-100 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(product);
                          }}
                        >
                          <Pencil size={14} />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[40px] border-none shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                                Delete Product?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                You are about to delete{" "}
                                <span className="text-red-500">
                                  {product.name}
                                </span>
                                . This action is permanent.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 pt-4">
                              <AlertDialogCancel className="rounded-2xl border-none bg-slate-100 font-black text-[10px] uppercase tracking-widest h-12 px-6">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => handleDelete(e, product.id)}
                                className="rounded-2xl bg-red-600 hover:bg-red-700 font-black text-[10px] uppercase tracking-widest h-12 px-6 shadow-lg shadow-red-200"
                              >
                                Confirm Delete
                              </AlertDialogAction>
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

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Rows per page:
              </span>
              <input
                type="number"
                value={itemsPerPageInput}
                onChange={handleItemsPerPageChange}
                onBlur={handleItemsPerPageBlur}
                className="w-12 rounded-xl border border-gray-200 text-xs font-black text-slate-900 px-2 py-1"
              />
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600"
              >
                <ChevronLeft size={16} className="mr-1" /> Prev
              </Button>

              {getPaginationPages().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-9 w-9 rounded-xl text-[11px] font-black transition-all transform active:scale-90 ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110"
                      : "bg-white text-blue-400 border border-slate-100 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600"
              >
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* BULK DELETE CONFIRMATION */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-[40px] border-none shadow-2xl max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
              Delete Selected Products?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              You are about to delete{" "}
              <span className="text-red-500">{selectedIds.size}</span> product
              {selectedIds.size > 1 ? "s" : ""}. This action is permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="rounded-2xl border-none bg-slate-100 font-black text-[10px] uppercase tracking-widest h-12 px-6">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="rounded-2xl bg-red-600 hover:bg-red-700 font-black text-[10px] uppercase tracking-widest h-12 px-6 shadow-lg shadow-red-200"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* BULK UPLOAD MODAL */}
      {isBulkUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                  Bulk Upload Products
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Upload multiple products via CSV or Excel
                </p>
              </div>
              <button
                onClick={() => setIsBulkUploadOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-10">
              <BulkUploadSection
                onUploadComplete={() => {
                  setIsBulkUploadOpen(false);
                  toast.success("Bulk upload completed!");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}