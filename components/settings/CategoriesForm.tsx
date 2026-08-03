"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  deleteCategory,
  setCategoryArchived,
  updateCategory,
} from "@/app/(app)/categories/actions";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  colorVar,
  type Category,
  type CategoryKind,
} from "@/lib/categories";

export function CategoriesForm({ categories }: { categories: Category[] }) {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();

  const visible = categories.filter(
    (c) => c.kind === kind && (showArchived ? c.is_archived : !c.is_archived)
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("kind", kind);
    setBusy(true);
    setError(null);
    const res = await createCategory(formData);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    form.reset();
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="card">
      <div className="row flex items-center justify-between gap-3">
        <p className="section-label">Categories</p>
        <div className="segmented" role="group" aria-label="Category kind">
          <button type="button" data-active={kind === "expense"} onClick={() => setKind("expense")}>
            Spending
          </button>
          <button type="button" data-active={kind === "income"} onClick={() => setKind("income")}>
            Income
          </button>
        </div>
      </div>

      {visible.map((category) => (
        <CategoryRow key={category.id} category={category} onDone={() => router.refresh()} />
      ))}

      {visible.length === 0 && (
        <p className="row text-[14px] text-muted">
          {showArchived ? "Nothing archived." : "No categories here yet."}
        </p>
      )}

      {error && <p className="row text-alarm text-[13px]">{error}</p>}

      {adding ? (
        <form onSubmit={handleCreate} className="row flex flex-col gap-2">
          <input name="name" className="input" placeholder="Category name" required autoFocus />
          <IconPicker />
          <ColorPicker />
          <div className="flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
              {busy ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      ) : (
        <div className="row flex items-center justify-between gap-2">
          <button type="button" className="btn text-[14px]" onClick={() => setAdding(true)}>
            Add category
          </button>
          <button
            type="button"
            className="btn btn-ghost text-[13px]"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "Show active" : "Show archived"}
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category, onDone }: { category: Category; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", category.id);
    setBusy(true);
    setError(null);
    const res = await updateCategory(formData);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditing(false);
    onDone();
  }

  async function run(fn: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onDone();
  }

  if (!editing) {
    return (
      <div className="row flex items-center gap-3">
        <div className="cat-icon" style={{ ["--cat-color" as string]: colorVar(category.color) }} aria-hidden>
          {category.icon}
        </div>
        <span className="text-[15px] flex-1 truncate">{category.name}</span>
        <button type="button" className="btn btn-ghost text-[13px]" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="row flex flex-col gap-2">
      <input name="name" className="input" defaultValue={category.name} required />
      <IconPicker current={category.icon} />
      <ColorPicker current={category.color} />
      {error && <p className="text-alarm text-[13px]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
          Save
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn flex-1 text-[14px]"
          disabled={busy}
          onClick={() => run(() => setCategoryArchived(category.id, !category.is_archived))}
        >
          {category.is_archived ? "Restore" : "Archive"}
        </button>
        <button
          type="button"
          className="btn btn-destructive flex-1 text-[14px]"
          disabled={busy}
          onClick={() => run(() => deleteCategory(category.id))}
        >
          Delete
        </button>
      </div>
      <p className="text-[12px] text-faint">
        Archiving hides it from new entries but leaves your history alone. Deleting only works when nothing
        uses it.
      </p>
    </form>
  );
}

function IconPicker({ current }: { current?: string }) {
  const [selected, setSelected] = useState(current ?? CATEGORY_ICONS[0]);
  return (
    <>
      <input type="hidden" name="icon" value={selected} />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Icon">
        {CATEGORY_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => setSelected(icon)}
            aria-label={`Icon ${icon}`}
            aria-pressed={selected === icon}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[17px] border"
            style={{
              borderColor: selected === icon ? "var(--accent)" : "var(--border)",
              background: selected === icon ? "var(--accent-soft)" : "transparent",
            }}
          >
            {icon}
          </button>
        ))}
      </div>
    </>
  );
}

function ColorPicker({ current }: { current?: string }) {
  const [selected, setSelected] = useState(current ?? "slate");
  return (
    <>
      <input type="hidden" name="color" value={selected} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Colour">
        {CATEGORY_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setSelected(color)}
            aria-label={color}
            aria-pressed={selected === color}
            className="w-8 h-8 rounded-full border-2"
            style={{
              background: colorVar(color),
              borderColor: selected === color ? "var(--text)" : "transparent",
            }}
          />
        ))}
      </div>
    </>
  );
}
