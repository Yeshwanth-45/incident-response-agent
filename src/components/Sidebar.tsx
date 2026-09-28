'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutDashboard, PlusCircle, History, BookOpen, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/incidents/new', label: 'New Incident', icon: PlusCircle },
  { href: '/history', label: 'Incident History', icon: History },
  { href: '/runbooks', label: 'Runbooks', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-navy-950 px-4 py-6 text-slate-300 sm:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span className="text-sm font-semibold leading-tight text-white">
          Incident Response
          <br />
          Agent
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-navy-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-lg bg-navy-800 px-3 py-3 text-xs text-slate-400">
        Memory layer: Hindsight
        <br />
        LLM: Groq
      </div>
    </aside>
  );
}
