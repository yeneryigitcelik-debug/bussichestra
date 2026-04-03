"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Plus, Search, AlertTriangle, DollarSign, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonCard, SkeletonTable } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  price: number;
  quantity: number;
  reorderAt: number;
  costPrice: number | null;
  location: string | null;
  supplier: string | null;
  isActive: boolean;
}

interface InventoryData {
  products: Product[];
  total_products: number;
  total_stock_value: number;
  low_stock_alerts: Product[];
}

function stockColor(quantity: number, reorderAtVal: number): string {
  if (quantity <= reorderAtVal) return "text-red-400";
  if (quantity <= reorderAtVal * 2) return "text-yellow-400";
  return "text-green-400";
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Form state for add product
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    category: "",
    quantity: "",
    reorder_at: "",
    cost_price: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categories = data
    ? Array.from(new Set(data.products.map((p) => p.category).filter(Boolean))) as string[]
    : [];

  const filteredProducts = data
    ? data.products.filter((p) => {
        if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
        if (lowStockOnly && !(p.reorderAt > 0 && p.quantity <= p.reorderAt)) return false;
        return true;
      })
    : [];

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          price: parseFloat(form.price),
          category: form.category || null,
          quantity: form.quantity ? parseInt(form.quantity, 10) : 0,
          reorder_at: form.reorder_at ? parseInt(form.reorder_at, 10) : 0,
          cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create product");
      setShowAddDialog(false);
      setForm({ name: "", sku: "", price: "", category: "", quantity: "", reorder_at: "", cost_price: "" });
      await fetchData();
    } catch (err) {
      console.error("Failed to add product:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjustStock(productId: string) {
    if (!adjustQty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/products?id=${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: parseInt(adjustQty, 10) }),
      });
      if (!res.ok) throw new Error("Failed to adjust stock");
      setAdjustingId(null);
      setAdjustQty("");
      await fetchData();
    } catch (err) {
      console.error("Failed to adjust stock:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Inventory</h1>
            <p className="text-sm text-muted-foreground">
              Track products and stock levels
            </p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Summary Cards */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Total Products */}
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-semibold">{data?.total_products ?? 0}</p>
                </div>
              </div>

              {/* Total Stock Value */}
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Value</p>
                  <p className="text-2xl font-semibold">
                    ${(data?.total_stock_value ?? 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>

              {/* Low Stock Alerts */}
              <div
                className={cn(
                  "flex items-center gap-4 rounded-xl border bg-card p-4",
                  (data?.low_stock_alerts?.length ?? 0) > 0
                    ? "border-red-500/40"
                    : "border-border"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    (data?.low_stock_alerts?.length ?? 0) > 0
                      ? "bg-red-500/10"
                      : "bg-secondary"
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "h-5 w-5",
                      (data?.low_stock_alerts?.length ?? 0) > 0
                        ? "text-red-400"
                        : "text-muted-foreground"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
                  <p
                    className={cn(
                      "text-2xl font-semibold",
                      (data?.low_stock_alerts?.length ?? 0) > 0 ? "text-red-400" : ""
                    )}
                  >
                    {data?.low_stock_alerts?.length ?? 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {!loading && data && data.products.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Low Stock Toggle */}
              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  lowStockOnly
                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Low Stock Only
              </button>
            </div>
          )}

          {/* Product Table */}
          {loading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : !data || data.products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product to start tracking inventory."
              action={{ label: "Add Product", onClick: () => setShowAddDialog(true) }}
            />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching products"
              description="Try adjusting your filters to find what you're looking for."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">Product Inventory</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Quantity</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50"
                      >
                        <td className="px-4 py-3 font-medium">{product.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {product.sku}
                        </td>
                        <td className="px-4 py-3">
                          {product.category ? (
                            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                              {product.category}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">${Number(product.price).toFixed(2)}</td>
                        <td
                          className={cn(
                            "px-4 py-3 font-semibold",
                            stockColor(product.quantity, product.reorderAt)
                          )}
                        >
                          {product.quantity}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {product.location ?? "--"}
                        </td>
                        <td className="px-4 py-3">
                          {adjustingId === product.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(e.target.value)}
                                placeholder="Qty"
                                className="w-20 rounded-md border border-border bg-secondary px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                autoFocus
                              />
                              <button
                                onClick={() => handleAdjustStock(product.id)}
                                disabled={saving || !adjustQty}
                                className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                {saving ? "..." : "Save"}
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustingId(null);
                                  setAdjustQty("");
                                }}
                                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAdjustingId(product.id);
                                setAdjustQty(String(product.quantity));
                              }}
                              className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            >
                              Adjust Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Product</h2>
              <button
                onClick={() => setShowAddDialog(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm text-muted-foreground">Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Product name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">SKU *</label>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="WK-0001"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Peripherals"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Price *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Reorder At</label>
                  <input
                    type="number"
                    min="0"
                    value={form.reorder_at}
                    onChange={(e) => setForm({ ...form, reorder_at: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
