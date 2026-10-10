import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ToolCard = forwardRef(function ToolCard({ tool, size = 'md', showArrow = true }, ref) {
  const { Icon, id, name, description, color, lightColor } = tool;

  if (size === 'sm') {
    return (
      <Link
        ref={ref}
        to={`/tools/${id}`}
        className="flex items-center gap-3 p-3 rounded-xl bg-[#181A20] border border-[#282B37] hover:border-brand-500/60 hover:bg-[#1F222B] transition-all duration-200 group"
      >
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-xs`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-slate-200 group-hover:text-brand-300 transition-colors truncate">
          {name}
        </span>
      </Link>
    );
  }

  return (
    <Link
      ref={ref}
      to={`/tools/${id}`}
      className="card-hover group flex flex-col bg-[#181A20] rounded-2xl border border-[#282B37] hover:border-brand-500/60 shadow-lg shadow-black/40 overflow-hidden"
    >
      {/* Gradient header strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${color}`} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-md`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors leading-tight truncate">
              {name}
            </h3>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${lightColor} mt-1.5 inline-block`}>
              {tool.category}
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed flex-1 line-clamp-2">
          {description}
        </p>

        {showArrow && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 group-hover:text-brand-300 group-hover:gap-2.5 transition-all pt-1">
            <span>Use Tool</span> <ArrowRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </Link>
  );
});

export default ToolCard;
