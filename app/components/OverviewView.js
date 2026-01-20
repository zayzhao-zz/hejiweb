"use client"

export default function OverviewView(){
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">概览</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow text-black dark:text-zinc-50">总营收：<div className="text-2xl font-bold">¥12,345</div></div>
        <div className="p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow text-black dark:text-zinc-50">今日订单：<div className="text-2xl font-bold">128</div></div>
        <div className="p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow text-black dark:text-zinc-50">桌位利用率：<div className="text-2xl font-bold">78%</div></div>
      </div>
      <div className="mt-6 p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow text-black dark:text-zinc-50">图表占位（销售趋势）</div>
    </div>
  )
}
