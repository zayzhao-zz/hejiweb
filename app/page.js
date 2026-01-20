"use client";

import Image from "next/image";
import { useState } from "react";
import SalesView from "./components/SalesView";
import OverviewView from "./components/OverviewView";
import OrdersView from "./components/OrdersView";
import MenuView from "./components/MenuView";
import StaffView from "./components/StaffView";
import SettingsView from "./components/SettingsView";

const SIDEBAR_ITEMS = [
  { id: "overview", label: "概览" },
  { id: "sales", label: "销售" },
  { id: "orders", label: "订单" },
  { id: "menu", label: "菜单" },
  { id: "staff", label: "员工" },
  { id: "settings", label: "设置" },
];

function Sidebar({ selected, onSelect }) {
  return (
    <aside className="w-64 min-h-screen border-r bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="px-6 py-8 flex items-center gap-3 border-b dark:border-gray-800">
        <Image src="/next.svg" alt="logo" width={36} height={14} className="dark:invert" />
        <h2 className="text-lg font-semibold">营业分析系统</h2>
      </div>
      <nav className="px-2 py-6">
        {SIDEBAR_ITEMS.map((it) => (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={`w-full text-left px-4 py-2 my-1 rounded-md transition-colors flex items-center gap-3 ${
                selected === it.id
                  ? "bg-black/10 text-black ring-1 ring-black/5 dark:bg-white/12 dark:text-zinc-50 dark:ring-white/20 font-medium"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            aria-current={selected === it.id}
          >
            <span className="w-2 h-2 rounded-full bg-primary/80" />
            <span>{it.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-4 mt-auto py-6 text-sm text-gray-500 dark:text-gray-400">
        版本 0.1 • 本地开发
      </div>
    </aside>
  );
}

function Content({ selected }) {
  if (selected === "overview") return <OverviewView />
  if (selected === 'sales') return <SalesView />
  if (selected === 'orders') return <OrdersView />
  if (selected === 'menu') return <MenuView />
  if (selected === 'staff') return <StaffView />
  if (selected === 'settings') return <SettingsView />

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">{SIDEBAR_ITEMS.find((s)=>s.id===selected)?.label}</h3>
      <div className="p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow text-black dark:text-zinc-50">{selected} 视图占位，后续接入真实数据和图表组件。</div>
    </div>
  )
}

export default function Home() {
  const [selected, setSelected] = useState("overview");

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-black font-sans">
      <Sidebar selected={selected} onSelect={setSelected} />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">餐厅营业分析</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">当前视图：{SIDEBAR_ITEMS.find((s)=>s.id===selected)?.label}</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-3 py-2 rounded-md border">导出</button>
              <button className="px-3 py-2 rounded-md bg-foreground text-background">刷新</button>
            </div>
          </div>

          <section className="bg-transparent">
            <Content selected={selected} />
          </section>
        </div>
      </main>
    </div>
  );
}
