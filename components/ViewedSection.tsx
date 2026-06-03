"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { listViewed, removeViewed } from "@/lib/local-store";
import type { ViewedNote } from "@/types";

export default function ViewedSection() {
  const [items, setItems] = useState<ViewedNote[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      listViewed().then((v) => {
        if (!cancelled) setItems(v);
      });
    load();
    window.addEventListener("noted:viewed-updated", load);
    return () => {
      cancelled = true;
      window.removeEventListener("noted:viewed-updated", load);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="border-t border-border shrink-0">
      <div className="px-3 py-2 text-xs text-text-muted flex items-center gap-1.5">
        <Eye size={12} /> viewed
      </div>
      <ul>
        {items.slice(0, 3).map((v) => (
          <li
            key={v.id}
            className="group flex items-center gap-1 px-2 py-1 text-sm hover:bg-bg-hover"
          >
            <span className="w-3 shrink-0" />
            <a
              href={`/share/${v.id}`}
              className="truncate flex-1 text-text-muted hover:text-text"
            >
              {v.name}
            </a>
            <button
              onClick={() =>
                removeViewed(v.id).then(() =>
                  window.dispatchEvent(new Event("noted:viewed-updated")),
                )
              }
              className="ml-auto p-0.5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-text"
              aria-label="remove from viewed"
            >
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
