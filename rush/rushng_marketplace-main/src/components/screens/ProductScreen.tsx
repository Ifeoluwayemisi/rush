"use client";

import { useState } from "react";
import { ChevronLeft, Star, MapPin, Minus, Plus, ShoppingBag, Store, Heart, Share2, Shield, Loader2 } from "lucide-react";
import { useRush } from "@/lib/store";
import { CONTENT_WIDTH } from "@/lib/layout";
import { useProduct } from "@/lib/hooks";
import { naira } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProductScreen() {
  const { params, navigate, back, addToCart, pushToast } = useRush();
  const { data, isLoading } = useProduct(params.productId);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) {
    return (
      <div className="pt-20 flex items-center justify-center text-ink-soft">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const product = data?.product;
  const vendor = data?.vendor;

  if (!product) {
    return (
      <div className="p-6 text-center text-sm text-ink-soft">Product not found.</div>
    );
  }

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      name: product.name,
      image: product.images[0],
      price: product.price,
      quantity: qty,
    });
    pushToast({
      title: "Added to cart",
      description: `${qty} × ${product.name}`,
    });
  };

  const handleBuyNow = () => {
    addToCart({
      productId: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      name: product.name,
      image: product.images[0],
      price: product.price,
      quantity: qty,
    });
    navigate("cart");
  };

  return (
    <div className="pb-24">
      {/* Image carousel */}
      <div className="relative">
        <div className="aspect-square bg-muted">
          {product.images[activeImage] && (
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-3 pb-3 flex items-center justify-between bg-gradient-to-b from-ink/30 to-transparent">
          <button
            onClick={back}
            className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 text-ink" />
          </button>
          <div className="flex gap-1.5">
            <button
              onClick={() => pushToast({ title: "Saved to wishlist" })}
              className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
              aria-label="Save"
            >
              <Heart className="h-5 w-5 text-ink" />
            </button>
            <button
              onClick={() => pushToast({ title: "Link copied" })}
              className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
              aria-label="Share"
            >
              <Share2 className="h-5 w-5 text-ink" />
            </button>
          </div>
        </div>

        {/* Image dots */}
        {product.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {product.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeImage ? "w-5 bg-white" : "w-1.5 bg-white/60"
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pt-4">
        {/* Vendor row */}
        {vendor && (
          <button
            onClick={() => navigate("store", { storeSlug: vendor.slug })}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/60 mb-3 hover:bg-muted transition-colors"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              {vendor.logo && <AvatarImage src={vendor.logo} alt={vendor.businessName} />}
              <AvatarFallback>{vendor.businessName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="text-xs font-semibold text-ink flex items-center gap-1">
                {vendor.businessName}
                {vendor.verified && (
                  <Shield className="h-3 w-3 text-rush fill-rush/20" />
                )}
              </p>
              <p className="text-[10px] text-ink-soft">Visit store</p>
            </div>
            <Store className="h-4 w-4 text-ink-soft" />
          </button>
        )}

        {/* Title & price */}
        <h1 className="text-base font-bold text-ink leading-snug">{product.name}</h1>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-2xl font-extrabold text-rush">
            {naira(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-sm text-ink-soft line-through">
              {naira(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
          <span className="flex items-center gap-0.5 font-semibold text-ink">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            {product.rating || "New"}
            {product.reviewCount > 0 && (
              <span className="text-ink-soft font-normal">({product.reviewCount})</span>
            )}
          </span>
          <span className="text-ink-soft">·</span>
          <span className="flex items-center gap-0.5 text-ink-soft">
            <MapPin className="h-3 w-3" /> {product.location}
          </span>
          {product.condition && (
            <>
              <span className="text-ink-soft">·</span>
              <span className="px-1.5 py-0.5 rounded bg-muted text-ink-soft font-medium">
                {product.condition.replace("_", " ")}
              </span>
            </>
          )}
        </div>

        {/* Stock alert */}
        {product.stock <= 4 && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-warning/10 text-warning text-xs font-medium">
            ⚡ Only {product.stock} left in stock
          </div>
        )}

        {/* Description */}
        <div className="mt-5">
          <h2 className="text-sm font-bold text-ink mb-1.5">Description</h2>
          <p className="text-sm text-ink-soft leading-relaxed">{product.description}</p>
        </div>

        {/* Quantity selector */}
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">Quantity</span>
          <div className="flex items-center gap-3 bg-muted rounded-lg p-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-7 w-7 rounded-md bg-background flex items-center justify-center shadow-sm"
              aria-label="Decrease"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm font-bold w-5 text-center">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              className="h-7 w-7 rounded-md bg-background flex items-center justify-center shadow-sm"
              aria-label="Increase"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <TrustBadge icon="🛡️" label="Rush protected" />
          <TrustBadge icon="🚚" label={vendor?.deliveryEnabled ? "Delivery available" : "Pickup only"} />
          <TrustBadge icon="✅" label={vendor?.verified ? "Verified vendor" : "New vendor"} />
        </div>
      </div>

      {/* Sticky CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-bottom">
        <div className={`mx-auto ${CONTENT_WIDTH} px-4 py-3 flex items-center gap-3`}>
          <button
            onClick={handleAddToCart}
            className="flex-1 h-12 rounded-xl bg-muted text-ink font-semibold text-sm flex items-center justify-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to cart
          </button>
          <button
            onClick={handleBuyNow}
            className="flex-1 h-12 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush"
          >
            Buy now · {naira(product.price * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/60 text-center">
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] font-medium text-ink-soft leading-tight">{label}</span>
    </div>
  );
}
