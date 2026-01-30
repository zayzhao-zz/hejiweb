"use client"

import { useEffect, useState } from 'react'

export default function MembershipView(){
  const [originalRows, setOriginalRows] = useState([])
  const [rows, setRows] = useState([])
  const [shops, setShops] = useState([])
  const [shopFilter, setShopFilter] = useState('')
  const [shopInput, setShopInput] = useState('')
  const todayStr = new Date().toISOString().slice(0,10)
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const oneYearAgoStr = oneYearAgo.toISOString().slice(0,10)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startInput, setStartInput] = useState(oneYearAgoStr)
  const [endInput, setEndInput] = useState(todayStr)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchCount, setFetchCount] = useState(null)

  function formatCurrency(v){ return v == null || v === '' ? '' : `¥${Number(v).toLocaleString()}` }

  async function fetchData(opts = {}){
    setLoading(true)
    try{
      const params = new URLSearchParams()
      const shop = opts.shop ?? shopFilter
      const dateFrom = opts.dateFrom ?? startDate
      const dateTo = opts.dateTo ?? endDate
      if(shop) params.set('shop', shop)
      if(dateFrom) params.set('dateFrom', dateFrom)
      if(dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/membership?${params.toString()}`)
      const json = await res.json()
      const data = json.data || []
      setOriginalRows(data)
      setRows(data)
      setFetchCount(data.length)
      const s = Array.from(new Set(data.map(d=> d['店铺']).filter(Boolean)))
      setShops(s)
    }catch(err){
      console.error('fetch membership failed', err)
      setOriginalRows([]); setRows([]); setFetchCount(0)
    }finally{ setLoading(false) }
  }

  // 不在挂载时自动加载，需点击“应用”或“刷新”以加载数据

  useEffect(()=>{
    if(!originalRows) return setRows([])
    let filtered = [...originalRows]
    if(shopFilter) filtered = filtered.filter(r=> r['店铺'] === shopFilter)
    if(startDate && endDate){
      filtered = filtered.filter(r=> {
        const d = (r['日期']||'').slice(0,10)
        return d >= startDate && d <= endDate
      })
    }
    setRows(filtered)
  }, [originalRows, shopFilter, startDate, endDate])

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">会员卡充值记录</h3>

      <div className="flex items-center gap-3 mb-4">
        <select value={shopInput} onChange={(e)=>setShopInput(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">全部门店</option>
          {shops.map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="relative">
          <button className="border px-3 py-1 rounded" onClick={()=>setShowDatePicker(v=>!v)}>{(startInput||endInput) ? `${startInput} → ${endInput}` : '选择日期区间'}</button>
          {showDatePicker && (
            <div className="absolute z-10 mt-2 p-3 bg-white dark:bg-zinc-800 border rounded shadow">
              <div className="flex items-center gap-2">
                <input type="date" value={startInput} onChange={(e)=>setStartInput(e.target.value)} className="border px-2 py-1 rounded" />
                <span>—</span>
                <input type="date" value={endInput} onChange={(e)=>setEndInput(e.target.value)} className="border px-2 py-1 rounded" />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button className="px-2 py-1 border rounded" onClick={()=>{setStartInput(''); setEndInput(''); setStartDate(''); setEndDate(''); setShowDatePicker(false)}}>清除</button>
                <button className="px-2 py-1 bg-foreground text-background rounded" onClick={()=>{ setStartDate(startInput); setEndDate(endInput); setShowDatePicker(false); fetchData({ dateFrom: startInput, dateTo: endInput }) }}>应用</button>
              </div>
            </div>
          )}
        </div>
        <button className="px-2 py-1 border rounded" onClick={()=>{ setShopInput(''); setStartInput(''); setEndInput(''); setStartDate(''); setEndDate(''); }}>清除</button>
        <button className="px-2 py-1 bg-foreground text-background rounded" onClick={()=>{ setShopFilter(shopInput); setStartDate(startInput); setEndDate(endInput); fetchData({ shop: shopInput, dateFrom: startInput, dateTo: endInput }); }}>应用</button>
        <div className="ml-auto text-sm text-gray-600">Rows: {fetchCount ?? '-'}</div>
      </div>

      <div className="overflow-auto bg-white dark:bg-zinc-900/60 rounded shadow text-black dark:text-zinc-50">
        {(loading || rows === null) ? <div className="p-4">加载中...</div> : (
          <table className="min-w-full text-left table-auto">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left">店铺</th>
                <th className="px-3 py-2 text-left">日期</th>
                <th className="px-3 py-2 text-right">充值</th>
                <th className="px-3 py-2 text-right">充值卡消费</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r.id} className="border-b odd:bg-white even:bg-slate-50 dark:odd:bg-zinc-900/60 dark:even:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-700">
                  <td className="px-3 py-2">{r['店铺']}</td>
                  <td className="px-3 py-2">{r['日期']}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r['充值'])}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r['充值卡消费'])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

