"use client"

import { useEffect, useState } from 'react'
import supabase from '../../lib/supabase'


export default function SalesView() {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [fetchCount, setFetchCount] = useState(null)
  const [originalRows, setOriginalRows] = useState(null)
  const [shops, setShops] = useState([])
  const [timeslots, setTimeslots] = useState([])
  const [shopFilter, setShopFilter] = useState('')
  const [shopInput, setShopInput] = useState('')
  // 默认日期范围：最近一年
  const todayStr = new Date().toISOString().slice(0,10)
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const oneYearAgoStr = oneYearAgo.toISOString().slice(0,10)
  const [startDate, setStartDate] = useState(oneYearAgoStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [startInput, setStartInput] = useState(oneYearAgoStr)
  const [endInput, setEndInput] = useState(todayStr)
  const [timeslotFilter, setTimeslotFilter] = useState('')
  const [timeslotInput, setTimeslotInput] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRow, setEditingRow] = useState({})
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState(null)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' })

  function showTooltipFromEvent(e, text){
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left
    const y = rect.top + rect.height / 2
    setTooltip({ visible: true, x, y, text })
  }
  function hideTooltip(){ setTooltip({ visible: false, x:0, y:0, text: '' }) }

  function formatCurrency(v){ return v == null || v === '' ? '' : `¥${Number(v).toLocaleString()}` }
  function renderRateBadge(rate){
    if(rate == null || rate === '' || isNaN(rate)) return <span className="text-sm text-gray-500">—</span>
    const pct = (rate*100)
    const sign = pct > 0 ? '▲' : (pct < 0 ? '▼' : '')
    const colorBg = pct > 0 ? 'bg-green-50 text-green-800' : (pct < 0 ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-700')
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${colorBg}`}>
        <span className="font-semibold">{sign}{Math.abs(pct).toFixed(1)}%</span>
      </span>
    )
  }

  // compute per-shop per-month per-timeslot revenue map for month-over-month calculation
  const revenueByShopMonthSlot = new Map()
  if (originalRows && Array.isArray(originalRows)) {
    for (const r of originalRows) {
      const shop = r['店铺'] || ''
      const timeslot = r['时间段'] || ''
      const dstr = (r['日期']||'').slice(0,10)
      const ym = dstr.slice(0,7) // YYYY-MM
      const key = `${shop}|${ym}|${timeslot}`
      const val = Number(r['金额']) || 0
      revenueByShopMonthSlot.set(key, (revenueByShopMonthSlot.get(key) || 0) + val)
    }
  }

  // total revenue per shop per month (sum across all time slots)
  const revenueByShopMonthTotal = new Map()
  if (originalRows && Array.isArray(originalRows)) {
    for (const r of originalRows) {
      const shop = r['店铺'] || ''
      const dstr = (r['日期']||'').slice(0,10)
      const ym = dstr.slice(0,7)
      const val = Number(r['金额']) || 0
      const tkey = `${shop}|${ym}`
      revenueByShopMonthTotal.set(tkey, (revenueByShopMonthTotal.get(tkey) || 0) + val)
    }
  }

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/sales')
      const json = await res.json()
      const data = json.data || []
      console.log('API /api/sales raw data:', data)
      setFetchError(null)
      setFetchCount(data.length)

      // keep original copy and show filtered view
      setOriginalRows(data)
      setRows(data)
    } catch (err) {
      console.error('Fetch /api/sales failed', err)
      setFetchError(err.message || String(err))
      setRows([])
      setOriginalRows([])
      setFetchCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ fetchData() }, [])
  useEffect(()=>{ fetchMeta() }, [])

  async function fetchMeta(){
    try{
      const res = await fetch('/api/sales/meta')
      const json = await res.json()
      setShops(json.shops || [])
      setTimeslots(json.timeslots || [])
    }catch(err){
      console.error('fetchMeta failed', err)
    }
  }

  // apply client-side filters + sorting
  useEffect(()=>{
    if (originalRows === null) return
    if(!originalRows || originalRows.length===0){
      setRows([])
      return
    }
    let filtered = [...originalRows]
    if(shopFilter) filtered = filtered.filter(r=> r['店铺'] === shopFilter)
    if(timeslotFilter) filtered = filtered.filter(r=> r['时间段'] === timeslotFilter)
    if(startDate && endDate){
      // compare YYYY-MM-DD strings lexicographically
      filtered = filtered.filter(r=> {
        const d = (r['日期']||'').slice(0,10)
        return d >= startDate && d <= endDate
      })
    } else if(startDate){
      filtered = filtered.filter(r=> (r['日期']||'').slice(0,10) >= startDate)
    } else if(endDate){
      filtered = filtered.filter(r=> (r['日期']||'').slice(0,10) <= endDate)
    }

    // sorting
    if(sortKey){
      const dir = sortDir === 'desc' ? -1 : 1
      filtered.sort((a,b)=>{
        try{
          if(sortKey === '日期'){
            const da = (a['日期']||'').slice(0,10)
            const db = (b['日期']||'').slice(0,10)
            if(da < db) return -1 * dir
            if(da > db) return 1 * dir
            return 0
          }
          if(sortKey === '金额' || sortKey === '交易次数'){
            const na = Number(a[sortKey]) || 0
            const nb = Number(b[sortKey]) || 0
            return (na - nb) * dir
          }
          const sa = (a[sortKey] || '').toString()
          const sb = (b[sortKey] || '').toString()
          if(sa < sb) return -1 * dir
          if(sa > sb) return 1 * dir
          return 0
        }catch(e){ return 0 }
      })
    }

    setRows(filtered)
  }, [shopFilter, timeslotFilter, startDate, endDate, originalRows, sortKey, sortDir])

  function toggleSort(key){
    if(sortKey !== key){
      setSortKey(key)
      setSortDir('asc')
    }else{
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    }
  }

  async function handleEditSave() {
    try {
      const payload = {
        id: editingRow.id,
        店铺: editingRow['店铺'],
        日期: editingRow['日期'],
        时间段: editingRow['时间段'],
        营业额: editingRow['金额'],
        交易次数: editingRow['交易次数'],
      }
      const res = await fetch('/api/sales', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'PUT /api/sales failed')
      }
      setEditingId(null)
      setEditingRow({})
      fetchData()
    } catch (err) {
      console.error('Update failed', err)
      setFetchError(err.message || String(err))
    }
  }
  // 文件导入与新增已移除；仅显示表格并支持编辑保存

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
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
                  <button className="px-2 py-1 border rounded" onClick={()=>{setStartDate(''); setEndDate(''); setShowDatePicker(false)}}>清除</button>
                  <button className="px-2 py-1 bg-foreground text-background rounded" onClick={()=>setShowDatePicker(false)}>应用</button>
                </div>
              </div>
            )}
          </div>

          <select value={timeslotInput} onChange={(e)=>setTimeslotInput(e.target.value)} className="border px-2 py-1 rounded">
            <option value="">全部时间段</option>
            {timeslots.map(t=> <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="px-2 py-1 border rounded" onClick={()=>{setShopInput(''); setTimeslotInput(''); setStartInput(''); setEndInput('');}}>清除</button>
          <button className="px-2 py-1 bg-foreground text-background rounded" onClick={()=>{ setShopFilter(shopInput); setTimeslotFilter(timeslotInput); setStartDate(startInput); setEndDate(endInput); }}>应用</button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">Rows: {fetchCount ?? '-'}</div>
          <button className="px-3 py-1 border rounded" onClick={()=>fetchData()}>刷新</button>
        </div>
      </div>

      

      <div className="overflow-auto bg-white dark:bg-zinc-900/60 rounded shadow text-black dark:text-zinc-50">
        {(loading || rows === null) ? <div className="p-4">加载中...</div> : (
          <table className="min-w-full text-left table-auto">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left sticky top-0 bg-white dark:bg-zinc-900">
                  <button onClick={()=>toggleSort('店铺')} className="flex items-center gap-1">
                    <span>店铺</span>
                    <span className="text-xs">{sortKey==='店铺' ? (sortDir==='asc' ? '▲' : '▼') : ''}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-left sticky top-0 bg-white dark:bg-zinc-900">
                  <button onClick={()=>toggleSort('日期')} className="flex items-center gap-1">
                    <span>日期</span>
                    <span className="text-xs">{sortKey==='日期' ? (sortDir==='asc' ? '▲' : '▼') : ''}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-left sticky top-0 bg-white dark:bg-zinc-900">
                  <button onClick={()=>toggleSort('时间段')} className="flex items-center gap-1">
                    <span>时间段</span>
                    <span className="text-xs">{sortKey==='时间段' ? (sortDir==='asc' ? '▲' : '▼') : ''}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-right sticky top-0 bg-white dark:bg-zinc-900">
                  <button onClick={()=>toggleSort('金额')} className="flex items-center gap-1 ml-auto">
                    <span>营业额</span>
                    <span className="text-xs">{sortKey==='金额' ? (sortDir==='asc' ? '▲' : '▼') : ''}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-right sticky top-0 bg-white dark:bg-zinc-900">
                  <button onClick={()=>toggleSort('交易次数')} className="flex items-center gap-1 ml-auto">
                    <span>交易次数</span>
                    <span className="text-xs">{sortKey==='交易次数' ? (sortDir==='asc' ? '▲' : '▼') : ''}</span>
                  </button>
                </th>
                <th className="px-3 py-2 text-right sticky top-0 bg-white dark:bg-zinc-900">
                  月度环比增长率
                  <span className="ml-1 inline-block">
                    <span className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700 text-xs text-gray-700 dark:text-gray-200 cursor-default"
                      onMouseEnter={(e)=>showTooltipFromEvent(e, '(本月总营业额 - 上月总营业额) / 上月总营业额')}
                      onMouseLeave={hideTooltip}
                    >?</span>
                  </span>
                </th>
                <th className="px-3 py-2 text-right sticky top-0 bg-white dark:bg-zinc-900">
                  环比增长率
                  <span className="ml-1 inline-block">
                    <span className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700 text-xs text-gray-700 dark:text-gray-200 cursor-default"
                      onMouseEnter={(e)=>showTooltipFromEvent(e, '同一时间段的 (本月营业额 - 上月营业额) / 上月营业额')}
                      onMouseLeave={hideTooltip}
                    >?</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r.id} className="border-b odd:bg-white even:bg-slate-50 dark:odd:bg-zinc-900/60 dark:even:bg-zinc-800/60 hover:bg-slate-100 dark:hover:bg-zinc-700">
                  <td className="px-3 py-2">{r['店铺']}</td>
                  <td className="px-3 py-2">{r['日期']}</td>
                  <td className="px-3 py-2">{r['时间段']}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r['金额'])}</td>
                  <td className="px-3 py-2 text-right">{r['交易次数']!=null ? Number(r['交易次数']).toLocaleString() : ''}</td>
                  <td className="px-3 py-2 text-right">
                    {(() => {
                      try{
                        const shop = r['店铺'] || ''
                        const dstr = (r['日期']||'').slice(0,10)
                        if(!dstr) return ''
                        const ym = dstr.slice(0,7)
                        const tKey = `${shop}|${ym}`
                        const d = new Date(dstr)
                        d.setMonth(d.getMonth() - 1)
                        const prevYm = d.toISOString().slice(0,7)
                        const prevTKey = `${shop}|${prevYm}`
                        const prevTotal = revenueByShopMonthTotal.get(prevTKey)
                        const curTotal = revenueByShopMonthTotal.get(tKey) || 0
                        if (prevTotal == null || prevTotal === 0) return renderRateBadge(null)
                        const rate = (curTotal - prevTotal) / prevTotal
                        return renderRateBadge(rate)
                      }catch(e){
                        return ''
                      }
                    })()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(() => {
                      try{
                        const shop = r['店铺'] || ''
                        const timeslot = r['时间段'] || ''
                        const dstr = (r['日期']||'').slice(0,10)
                        if(!dstr) return ''
                        const ym = dstr.slice(0,7)
                        const curKey = `${shop}|${ym}|${timeslot}`
                        // previous month same timeslot
                        const d = new Date(dstr)
                        d.setMonth(d.getMonth() - 1)
                        const prevYm = d.toISOString().slice(0,7)
                        const prevKey = `${shop}|${prevYm}|${timeslot}`
                        const prevRev = revenueByShopMonthSlot.get(prevKey)
                        const curRev = revenueByShopMonthSlot.get(curKey) || 0
                        if (prevRev == null || prevRev === 0) return renderRateBadge(null)
                        const rate = (curRev - prevRev) / prevRev
                        return renderRateBadge(rate)
                      }catch(e){
                        return ''
                      }
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {tooltip.visible && (
        <div style={{position:'fixed', left: tooltip.x - 8, top: tooltip.y, transform: 'translateX(-100%) translateY(-50%)', zIndex:9999}}>
          <div className="whitespace-nowrap px-2 py-1 text-xs bg-black text-white rounded shadow">{tooltip.text}</div>
        </div>
      )}
    </div>
  )
}
