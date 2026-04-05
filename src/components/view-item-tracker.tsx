"use client";

import { useEffect, useRef } from "react";
import { trackViewItem } from "@/lib/analytics";

type ViewItemTrackerProps = {
  productId: string;
  price: number;
};

export function ViewItemTracker({ productId, price }: ViewItemTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    if (!productId) return;

    trackedRef.current = true;
    trackViewItem({ productId, price });
  }, [productId, price]);

  return null;
}

