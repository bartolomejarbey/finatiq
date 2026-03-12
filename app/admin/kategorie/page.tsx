"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
};

export default function AdminKategorie() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  // Formulář
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("admin_role")
        .eq("id", user.id)
        .single();

      if (!profile?.admin_role) {
        router.push("/dashboard");
        return;
      }

      await loadCategories();
      setLoading(false);
    }

    checkAdminAndLoad();
  }, [router]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (data) {
      setCategories(data);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingId) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const categoryData = {
      name,
      slug,
      icon,
      description: description || null,
    };

    if (editingId) {
      await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingId);
    } else {
      await supabase
        .from("categories")
        .insert(categoryData);
    }

    await loadCategories();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setIcon(category.icon);
    setDescription(category.description || "");
    setShowForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Opravdu chcete smazat tuto kategorii? Tato akce může ovlivnit existující poptávky.")) {
      return;
    }

    await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    await loadCategories();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setSlug("");
    setIcon("");
    setDescription("");
  };

  const commonIcons = ["🔧", "⚡", "🔨", "🎨", "🏠", "🚗", "💻", "📱", "🌿", "🧹", "📦", "🔒", "💡", "🚿", "❄️", "🔥", "📸", "✂️", "🧰", "🛠️"];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📂 Kategorie</h1>
            <p className="text-slate-400">
              Celkem {categories.length} kategorií
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors"
          >
            + Přidat kategorii
          </button>
        </div>

        {/* Formulář */}
        {showForm && (
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingId ? "Upravit kategorii" : "Nová kategorie"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Název *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="např. Elektrikář"
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    placeholder="např. elektrikar"
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Ikona *
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    required
                    placeholder="např. ⚡"
                    className="w-24 px-3 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-center text-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-slate-500 self-center">nebo vyberte:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {commonIcons.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`w-10 h-10 text-xl rounded-lg border border-white/10 hover:bg-white/10 transition-colors ${
                        icon === emoji ? "bg-cyan-500/20 border-cyan-500" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Popis
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Krátký popis kategorie..."
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Ukládám..." : editingId ? "Uložit změny" : "Přidat kategorii"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 text-slate-400 hover:text-white transition-colors"
                >
                  Zrušit
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Seznam kategorií */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Žádné kategorie. Přidejte první kategorii.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Ikona
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Název
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Popis
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-2xl">
                        {category.icon}
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {category.slug}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {category.description || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors"
                          >
                            Upravit
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                          >
                            Smazat
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
