"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { familyLinks, mainNavigation } from "@/config/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
          Allied
        </p>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">
          Product Directory
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Product data workspace for sales and operations
        </p>
      </div>

      <nav className="flex-1 space-y-8 px-4 py-6">
        <div className="space-y-1">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-violet-50 text-violet-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Families
          </p>
          <div className="mt-3 space-y-1">
            {familyLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
