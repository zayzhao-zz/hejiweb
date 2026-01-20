"use client"

import { useEffect, useState } from 'react'
import supabase from '../../lib/supabase'


export default function SalesView() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [fetchCount, setFetchCount] = useState(null)
  const [originalRows, setOriginalRows] = useState([])
  const [shops, setShops] = useState([])
  const [timeslots, setTimeslots] = useState([])
  const [shopFilter, setShopFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [timeslotFilter, setTimeslotFilter] = useState('')
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingRow, setEditingRow] = useState({})

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

  // apply client-side filters
  useEffect(()=>{
    if(!originalRows || originalRows.length===0){
      setRows([])
      return
    }
    let filtered = [...originalRows]
    if(shopFilter) filtered = filtered.filter(r=> r['店铺'] === shopFilter)
    if(timeslotFilter) filtered = filtered.filter(r=> r['时间段'] === timeslotFilter)
    if(dateFilter){
      // dateFilter expected YYYY-MM
      filtered = filtered.filter(r=> (r['日期']||'').startsWith(dateFilter))
    }
    setRows(filtered)
  }, [shopFilter, timeslotFilter, dateFilter, originalRows])

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
          <select value={shopFilter} onChange={(e)=>setShopFilter(e.target.value)} className="border px-2 py-1 rounded">
            <option value="">全部门店</option>
            {shops.map(s=> <option key={s} value={s}>{s}</option>)}
          </select>

          <div onMouseEnter={()=>setShowMonthPicker(true)} onMouseLeave={()=>setShowMonthPicker(false)} className="relative">
            {!showMonthPicker ? (
              <div className="border px-3 py-1 rounded">{dateFilter || '选择年月'}</div>
            ) : (
              <input type="month" value={dateFilter} onChange={(e)=>setDateFilter(e.target.value)} className="border px-2 py-1 rounded" />
            )}
          </div>

          <select value={timeslotFilter} onChange={(e)=>setTimeslotFilter(e.target.value)} className="border px-2 py-1 rounded">
            <option value="">全部时间段</option>
            {timeslots.map(t=> <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="px-2 py-1 border rounded" onClick={()=>{setShopFilter(''); setDateFilter(''); setTimeslotFilter('')}}>清除</button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">Rows: {fetchCount ?? '-'}</div>
          <button className="px-3 py-1 border rounded" onClick={()=>fetchData()}>刷新</button>
        </div>
      </div>

      

      <div className="overflow-auto bg-white dark:bg-zinc-900/60 rounded shadow text-black dark:text-zinc-50">
        {loading ? <div className="p-4">加载中...</div> : (
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2">店铺</th>
                <th className="px-3 py-2">日期</th>
                <th className="px-3 py-2">时间段</th>
                <th className="px-3 py-2">营业额</th>
                <th className="px-3 py-2">交易次数</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r.id} className="border-b">
                  <td className="px-3 py-2">{editingId===r.id ? <input value={editingRow['店铺']||''} onChange={e=>setEditingRow({...editingRow,'店铺':e.target.value})} /> : r['店铺']}</td>
                  <td className="px-3 py-2">{editingId===r.id ? <input type="date" value={editingRow['日期']||''} onChange={e=>setEditingRow({...editingRow,'日期':e.target.value})} /> : r['日期']}</td>
                  <td className="px-3 py-2">{editingId===r.id ? <input value={editingRow['时间段']||''} onChange={e=>setEditingRow({...editingRow,'时间段':e.target.value})} /> : r['时间段']}</td>
                  <td className="px-3 py-2">{editingId===r.id ? <input value={editingRow['金额']||''} onChange={e=>setEditingRow({...editingRow,'金额':e.target.value})} /> : r['金额']}</td>
                  <td className="px-3 py-2">{editingId===r.id ? <input value={editingRow['交易次数']||''} onChange={e=>setEditingRow({...editingRow,'交易次数':e.target.value})} /> : r['交易次数']}</td>
                  <td className="px-3 py-2">
                    {editingId===r.id ? (
                      <>
                        <button className="px-2 py-1 mr-2 border rounded" onClick={handleEditSave}>保存</button>
                        <button className="px-2 py-1 border rounded" onClick={()=>{setEditingId(null); setEditingRow({})}}>取消</button>
                      </>
                    ) : (
                      <>
                        <button className="px-2 py-1 mr-2 border rounded" onClick={()=>{setEditingId(r.id); setEditingRow(r)}}>编辑</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
