"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SHOP_CATEGORIES } from "@/lib/data";
import { useCreateProduct, useUpdateProduct } from "@/lib/hooks";
import { useRush } from "@/lib/store";
import type { Product } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { PhotoUploader } from "@/components/shared/PhotoUploader";

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an existing product to edit it; omit to create a new one. */
  product?: Product | null;
  defaultLocation?: string;
}

const CONDITIONS = ["NEW", "LIKE_NEW", "USED", "REFURBISHED"];

// Wrapper: remounts the form (via `key`) whenever the sheet opens for a
// different product (or a fresh "add" form), so form state is always
// initialized fresh from props instead of being synced with an effect.
export function ProductFormSheet({ open, onOpenChange, product, defaultLocation }: ProductFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{product ? "Edit product" : "Add product"}</SheetTitle>
        </SheetHeader>
        {open && (
          <ProductForm
            key={product?.id || "new"}
            product={product}
            defaultLocation={defaultLocation}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ProductForm({
  product,
  defaultLocation,
  onDone,
}: {
  product?: Product | null;
  defaultLocation?: string;
  onDone: () => void;
}) {
  const { pushToast } = useRush();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compareAtPrice ? String(product.compareAtPrice) : "",
  );
  const [category, setCategory] = useState(product?.category ?? SHOP_CATEGORIES[0].id);
  const [condition, setCondition] = useState<string>(product?.condition ?? "NEW");
  const [stock, setStock] = useState(product ? String(product.stock) : "1");
  // Images: array of /uploads/<id>.webp URLs (returned by POST /api/uploads).
  // Seeded from the existing product when editing.
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [error, setError] = useState<string | null>(null);

  const saving = createProduct.isPending || updateProduct.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !description.trim() || !price || images.length === 0) {
      setError("Name, description, price, and at least one photo are required.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      images,
      category,
      condition,
      stock: Number(stock) || 0,
      location: defaultLocation,
    };

    try {
      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...payload });
        pushToast({ title: "Product updated" });
      } else {
        await createProduct.mutateAsync(payload);
        pushToast({ title: "Product added", description: name.trim() });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3.5">
      <Field label="Product name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nike Air Max 90" />
      </Field>

      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the product — condition, size, what's included…"
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (₦)">
          <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="15000" />
        </Field>
        <Field label="Compare-at price (₦)">
          <Input
            type="number"
            min="0"
            value={compareAtPrice}
            onChange={(e) => setCompareAtPrice(e.target.value)}
            placeholder="Optional"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {SHOP_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Condition">
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Stock quantity">
        <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
      </Field>

      <PhotoUploader value={images} onChange={setImages} maxImages={6} label="Photos" />

      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

      <SheetFooter className="px-0 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Save changes" : "Add product"}
        </button>
      </SheetFooter>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink-soft mb-1">{label}</span>
      {children}
    </label>
  );
}
