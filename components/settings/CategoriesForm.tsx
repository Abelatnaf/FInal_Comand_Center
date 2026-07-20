"use client";

import { useState } from "react";
import { addCategory, deleteCategory } from "@/app/(app)/settings/actions";

type Category = { id: string; name: string };

export function CategoriesForm({ categories }: { categories: Category[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col">
      {categories.map((c, i) => (
        <div key={c.id} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-[var(--separator)]" : ""}`}>
          <div className="ios-body">{c.name}</div>
          <button onClick={() => deleteCategory(c.id)} className="link-destructive text-[13px]">
            Delete
          </button>
        </div>
      ))}

      {adding ? (
        <form
          action={async (formData) => {
            await addCategory(formData);
            setAdding(false);
          }}
          className={`flex gap-2.5 py-3 ${categories.length > 0 ? "border-t border-[var(--separator)]" : ""}`}
        >
          <input name="name" required autoFocus placeholder="Category name" className="input text-sm !py-2 !px-3 flex-1" />
          <button type="submit" className="btn btn-primary text-[13px] !py-1.5 !px-3">
            Add
          </button>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="link-action text-[13px] text-left py-2">
          + Add category
        </button>
      )}
    </div>
  );
}
