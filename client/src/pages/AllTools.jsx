import { useState } from 'react';
import { TOOLS, CATEGORIES } from '../config/tools';
import ToolCard from '../components/ToolCard';
import { Search } from 'lucide-react';

export default function AllTools() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = TOOLS.filter((t) => {
    const matchesSearch =
      !query ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase());
    const matchesCat = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen py-14 px-4 bg-[#0B0B0F]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">All PDF Tools</h1>
          <p className="text-slate-400 mt-2 text-base sm:text-lg">
            {TOOLS.length} dedicated tools to handle any PDF, image, or document workflow
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-9">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools by name or description…"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#282B37] bg-[#181A20] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition shadow-lg shadow-black/40"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {['All', ...CATEGORIES.map((c) => c.id)].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                activeCategory === cat
                  ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-950/60'
                  : 'bg-[#181A20] text-slate-300 border-[#282B37] hover:border-brand-500/50 hover:text-white hover:bg-[#1F222B]'
              }`}
            >
              {cat === 'All' ? 'All Categories' : CATEGORIES.find((c) => c.id === cat)?.label || cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
            {filtered.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#181A20] border border-[#282B37] rounded-2xl max-w-md mx-auto p-8 shadow-lg shadow-black/40">
            <p className="text-lg font-semibold text-white">No tools match "{query}"</p>
            <p className="text-sm text-slate-400 mt-1">Try another keyword or category filter</p>
            <button
              onClick={() => { setQuery(''); setActiveCategory('All'); }}
              className="mt-4 px-4 py-2 rounded-lg bg-brand-600/30 border border-brand-600 text-brand-300 hover:bg-brand-600 hover:text-white transition-colors text-sm font-medium"
            >
              Reset Search & Filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
