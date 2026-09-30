import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, ChartNoAxesCombined, UsersRound } from "lucide-react";
import { mcxProducts } from "@/lib/mcx-products";

export function McxProductCard() {
  const product = mcxProducts[0];

  return (
    <Link
      to={product.to}
      aria-label={`Conhecer ${product.name}`}
      className="group grid overflow-hidden border border-mcx-ink/15 bg-mcx-panel text-mcx-ink transition-colors duration-300 hover:border-mcx-highlight/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mcx-highlight md:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]"
    >
      <div className="flex min-h-[360px] flex-col justify-between p-7 sm:p-10 lg:p-14">
        <div className="flex items-center gap-3 text-xs font-medium uppercase text-mcx-soft">
          <span className="size-2 bg-mcx-highlight" aria-hidden="true" />
          Produto MCX Digital <span className="ml-auto text-mcx-muted">01 / 01</span>
        </div>
        <div className="my-12">
          <p className="mb-4 text-xs font-semibold uppercase text-mcx-highlight">{product.category}</p>
          <h3 className="mb-5 font-display text-4xl font-semibold leading-tight sm:text-5xl">{product.name}</h3>
          <p className="max-w-md text-base leading-relaxed text-mcx-soft">{product.description}</p>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-mcx-ink/15 pt-6">
          <span className="text-sm font-medium">Explorar produto</span>
          <span className="grid size-10 shrink-0 place-items-center border border-mcx-ink/25 transition-colors duration-300 group-hover:border-mcx-highlight group-hover:bg-mcx-brand group-hover:text-mcx-ink">
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="relative flex min-h-[310px] flex-col justify-center overflow-hidden border-t border-mcx-ink/10 bg-mcx-display px-6 py-9 sm:px-10 md:border-l md:border-t-0 lg:px-14" aria-hidden="true">
        <div className="absolute left-0 top-0 h-1 w-24 bg-mcx-highlight" />
        <div className="mb-5 flex items-center justify-between text-xs text-mcx-soft">
          <span className="font-semibold uppercase">LocalPro / Visão geral</span>
          <span className="size-2 rounded-full bg-mcx-success" />
        </div>
        <div className="border border-mcx-ink/15 bg-mcx-panel/80 p-5 shadow-xl sm:p-7">
          <div className="mb-7 flex items-center justify-between gap-4 border-b border-mcx-ink/10 pb-5">
            <div>
              <p className="text-xs text-mcx-muted">Seu negócio, em movimento</p>
              <p className="mt-1 font-display text-xl font-semibold">Tudo em um lugar.</p>
            </div>
            <span className="grid size-9 shrink-0 place-items-center bg-mcx-brand/15 text-mcx-highlight"><ChartNoAxesCombined size={18} /></span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="border border-mcx-ink/10 p-3 sm:p-4"><UsersRound className="mb-5 text-mcx-highlight" size={19} /><p className="text-sm font-medium">Clientes</p></div>
            <div className="border border-mcx-ink/10 p-3 sm:p-4"><CalendarDays className="mb-5 text-mcx-highlight" size={19} /><p className="text-sm font-medium">Agenda</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-mcx-ink/10 pt-4 text-xs text-mcx-soft">
            {product.features.slice(2).map((feature) => <span key={feature}>{feature}</span>)}
          </div>
        </div>
        <span className="absolute bottom-4 right-6 text-xs font-semibold text-mcx-muted sm:right-10">MCX DIGITAL / 001</span>
      </div>
    </Link>
  );
}