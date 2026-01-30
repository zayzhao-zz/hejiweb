"use client"

import { useEffect, useState, useRef } from 'react'

export default function OverviewView(){
  const [originalRows, setOriginalRows] = useState([])
  const [rows, setRows] = useState([])
  const [shops, setShops] = useState([])
  const [timeslots, setTimeslots] = useState([])
  const todayStr = new Date().toISOString().slice(0,10)
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const oneYearAgoStr = oneYearAgo.toISOString().slice(0,10)
  const [shopFilter, setShopFilter] = useState('')
  const [shopInput, setShopInput] = useState('')
  const [timeslotFilter, setTimeslotFilter] = useState('')
  const [timeslotInput, setTimeslotInput] = useState('')
  const [startDate, setStartDate] = useState(oneYearAgoStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [startInput, setStartInput] = useState(oneYearAgoStr)
  const [endInput, setEndInput] = useState(todayStr)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [fetchCount, setFetchCount] = useState(null)

  async function fetchData(){
    try{
      const res = await fetch('/api/sales')
      const json = await res.json()
      const data = json.data || []
      setOriginalRows(data)
      setFetchCount(data.length)
    }catch(err){
      console.error('Overview fetch failed', err)
      setOriginalRows([])
      setFetchCount(0)
    }
  }

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

  useEffect(()=>{ fetchData(); fetchMeta() }, [])

  // apply filters
  useEffect(()=>{
    if(!originalRows) return setRows([])
    let filtered = [...originalRows]
    if(shopFilter) filtered = filtered.filter(r=> r['店铺'] === shopFilter)
    if(timeslotFilter) filtered = filtered.filter(r=> r['时间段'] === timeslotFilter)
    if(startDate && endDate){
      filtered = filtered.filter(r=>{
        const d = (r['日期']||'').slice(0,10)
        return d >= startDate && d <= endDate
      })
    }
    setRows(filtered)
  }, [originalRows, shopFilter, timeslotFilter, startDate, endDate])

  // Fetch employee salary total for current filters (shop, date range)
  useEffect(()=>{
    let mounted = true
    async function fetchSalary(){
      try{
        const params = new URLSearchParams()
        if (shopFilter) params.set('shop', shopFilter)
        if (startDate) params.set('dateFrom', startDate)
        if (endDate) params.set('dateTo', endDate)
        const res = await fetch(`/api/salary?${params.toString()}`)
        const json = await res.json()
        const data = json.data || []
        const sum = data.reduce((s, r)=> s + (Number(r['工资']) || 0), 0)
        if(mounted) setEmployeeTotal(sum)
      }catch(err){
        console.error('fetch salary total failed', err)
        if(mounted) setEmployeeTotal(0)
      }
    }
    fetchSalary()
    return ()=>{ mounted = false }
  }, [shopFilter, startDate, endDate])

  const totalRevenue = rows.reduce((s, r)=> s + (Number(r['金额']) || 0), 0)
  const totalOrders = rows.reduce((s, r)=> s + (Number(r['交易次数']) || 0), 0)
  const [employeeTotal, setEmployeeTotal] = useState(0)

  const earlyRevenue = rows.filter(r=> (r['时间段']||'').includes('早')).reduce((s,r)=> s + (Number(r['金额'])||0), 0)
  const midRevenue = rows.filter(r=> (r['时间段']||'').includes('中')).reduce((s,r)=> s + (Number(r['金额'])||0), 0)
  const lateRevenue = rows.filter(r=> (r['时间段']||'').includes('晚')).reduce((s,r)=> s + (Number(r['金额'])||0), 0)

  const pct = (v)=> totalRevenue ? `${(v/totalRevenue*100).toFixed(1)}%` : '—'
  const earlyPct = pct(earlyRevenue)
  const midPct = pct(midRevenue)
  const latePct = pct(lateRevenue)

  // build monthly aggregation for chart (YYYY-MM -> sum of 金额)
  const monthKey = (d)=> (d||'').slice(0,7)
  const startKey = startDate || oneYearAgoStr
  const endKey = endDate || todayStr
  function monthsBetween(startK, endK){
    const res = []
    const [ys, ms] = startK.split('-').map(Number)
    const [ye, me] = endK.split('-').map(Number)
    let y = ys, m = ms
    while(y < ye || (y===ye && m<=me)){
      res.push(`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}`)
      m++
      if(m>12){ m=1; y++ }
    }
    return res
  }

  const months = monthsBetween(startKey.slice(0,7), endKey.slice(0,7))
  const monthlyMap = new Map()
  for(const mo of months) monthlyMap.set(mo, 0)
  for(const r of rows){
    const k = monthKey(r['日期'])
    if(!k) continue
    monthlyMap.set(k, (monthlyMap.get(k) || 0) + (Number(r['金额'])||0))
  }

  const monthlyValues = months.map(m=> monthlyMap.get(m) || 0)
  const maxVal = Math.max(...monthlyValues, 1)

  const chartRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const chartRefLine = useRef(null)
  const chartInstanceLineRef = useRef(null)

  useEffect(()=>{
    let mounted = true
    let resizeHandler = null
    // 动态导入以避免 SSR 问题并减小初始包体积
    import('echarts').then(echarts => {
      if(!mounted) return
      try{
        const chart = echarts.init(chartRef.current)
        chartInstanceRef.current = chart
        const xData = months
        const seriesData = monthlyValues.map(v => Number((v/10000).toFixed(2)))
        // monthly MoM growth (%) based on raw monthlyValues
        const growthRates = monthlyValues.map((v, i) => {
          if (i === 0) return null
          const prev = monthlyValues[i-1]
          if (prev == null || prev === 0) return null
          return (v - prev) / prev * 100
        })
        const option = {
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function(params){
              const p = params[0]
              return `${p.axisValue}<br/>${p.value.toFixed(2)}万`
            }
          },
          grid: { left: '6%', right: '4%', bottom: '18%', top: '10%' },
          xAxis: { type: 'category', data: xData, axisLabel: { rotate: 45, formatter: v => v } },
          yAxis: { type: 'value', axisLabel: { formatter: v => `${v}万` } },
          series: [{
            type: 'bar',
            data: seriesData,
            itemStyle: { color: '#06b6d4' },
            label: { show: true, position: 'top', formatter: params => `${params.value.toFixed(2)}万` }
          }]
        }
        chart.setOption(option)
        resizeHandler = ()=> chart.resize()
        window.addEventListener('resize', resizeHandler)
      }catch(e){ console.error('echarts init error', e) }
    }).catch(err=>{ console.error('load echarts failed', err) })

    return ()=>{
      mounted = false
      if(chartInstanceRef.current){ chartInstanceRef.current.dispose(); chartInstanceRef.current = null }
      if(resizeHandler) window.removeEventListener('resize', resizeHandler)
    }
  // months/monthlyValues 变化时更新图表
  }, [months.join(','), monthlyValues.join(',')])

  // line chart: monthly revenue with MoM growth labels
  useEffect(()=>{
    let mounted = true
    let resizeHandler = null
    import('echarts').then(echarts => {
      if(!mounted) return
      try{
        const chart = echarts.init(chartRefLine.current)
        chartInstanceLineRef.current = chart
        const xData = months
        const growthRates = monthlyValues.map((v, i) => {
          if (i === 0) return null
          const prev = monthlyValues[i-1]
          if (prev == null || prev === 0) return null
          return (v - prev) / prev * 100
        })
        const seriesData = growthRates.map(g => {
          if (g == null) return { value: null, label: { show: false } }
          const v = Number(g.toFixed(2))
          const color = v > 0 ? '#10b981' : '#ef4444'
          return { value: v, itemStyle: { color }, label: { show: true, formatter: `${v.toFixed(2)}%`, color } }
        })
        const option = {
          tooltip: {
            trigger: 'axis',
            formatter: function(params){
              const p = params[0]
              const idx = p.dataIndex
              const g = growthRates[idx]
              const gStr = (g == null) ? '—' : `${g.toFixed(2)}%`
              return `${p.axisValue}<br/>月度环比：${gStr}`
            }
          },
          grid: { left: '6%', right: '4%', bottom: '18%', top: '10%' },
          xAxis: { type: 'category', data: xData, axisLabel: { rotate: 45 } },
          yAxis: { type: 'value', axisLabel: { formatter: v => `${v}%` } },
          series: [{
            type: 'line',
            data: seriesData,
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: { color: '#6b7280' }
          }]
        }
        chart.setOption(option)
        resizeHandler = ()=> chart.resize()
        window.addEventListener('resize', resizeHandler)
      }catch(e){ console.error('echarts line init error', e) }
    }).catch(err=>{ console.error('load echarts failed', err) })

    return ()=>{
      mounted = false
      if(chartInstanceLineRef.current){ chartInstanceLineRef.current.dispose(); chartInstanceLineRef.current = null }
      if(resizeHandler) window.removeEventListener('resize', resizeHandler)
    }
  }, [months.join(','), monthlyValues.join(',')])
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">概览</h3>

      <div className="flex items-center gap-3 mb-4">
        <select value={shopInput} onChange={(e)=>setShopInput(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">全部门店</option>
          {shops.map(s=> <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="relative">
          <button className="border px-3 py-1 rounded" onClick={()=>setShowDatePicker(v=>!v)}>{startInput && endInput ? `${startInput} → ${endInput}` : '选择日期区间'}</button>
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

        <button className="px-2 py-1 border rounded" onClick={()=>{setShopInput(''); setTimeslotInput(''); setStartInput(oneYearAgoStr); setEndInput(todayStr);}}>清除</button>
        <button className="px-2 py-1 bg-foreground text-background rounded" onClick={()=>{ setShopFilter(shopInput); setTimeslotFilter(timeslotInput); setStartDate(startInput); setEndDate(endInput); }}>应用</button>
        <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">Rows: {fetchCount ?? '-'}</div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow text-black dark:text-zinc-50">总营收：<div className="text-2xl font-bold">¥{totalRevenue.toLocaleString()}</div></div>
        <div className="p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow text-black dark:text-zinc-50">订单量：<div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div></div>
        <div className="p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow text-black dark:text-zinc-50 relative">
          <div className="absolute top-2 right-2">
            <div className="relative group">
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-700 text-xs flex items-center justify-center text-gray-700 dark:text-gray-200 cursor-default">?</div>
              <div className="hidden group-hover:block absolute -top-12 right-0 w-max px-2 py-1 text-xs bg-black text-white rounded shadow">
                客单价 = 总营收 ÷ 订单量
              </div>
            </div>
          </div>
          客单价：<div className="text-2xl font-bold">{totalOrders ? `¥${(totalRevenue/totalOrders).toFixed(2)}` : '—'}</div>
        </div>
        <div className="p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow text-black dark:text-zinc-50 relative">
          <div className="absolute top-2 right-2">
            <div className="relative group">
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-700 text-xs flex items-center justify-center text-gray-700 dark:text-gray-200 cursor-default">?</div>
              <div className="hidden group-hover:block absolute -top-12 right-0 w-max px-2 py-1 text-xs bg-black text-white rounded shadow">
                人力成本率 = 员工总薪资 / 总营业额
              </div>
            </div>
          </div>
          人力成本率：<div className="text-2xl font-bold">{totalRevenue ? `${((employeeTotal/totalRevenue)*100).toFixed(2)}%` : '—'}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="p-3 rounded bg-white/80 dark:bg-zinc-800/60 shadow">
          <div className="text-gray-600 dark:text-gray-300">早时段贡献率</div>
          <div className="text-lg font-bold mt-1">{earlyPct}</div>
        </div>
        <div className="p-3 rounded bg-white/80 dark:bg-zinc-800/60 shadow">
          <div className="text-gray-600 dark:text-gray-300">中时段贡献率</div>
          <div className="text-lg font-bold mt-1">{midPct}</div>
        </div>
        <div className="p-3 rounded bg-white/80 dark:bg-zinc-800/60 shadow">
          <div className="text-gray-600 dark:text-gray-300">晚时段贡献率</div>
          <div className="text-lg font-bold mt-1">{latePct}</div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-lg bg-white dark:bg-zinc-800/60 shadow">
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">销售趋势（按月）</div>
        <div className="w-full overflow-x-auto">
          <div ref={chartRef} style={{ width: '100%', height: 220 }} />
        </div>
        <div className="w-full overflow-x-auto mt-4">
          <div ref={chartRefLine} style={{ width: '100%', height: 260 }} />
        </div>
      </div>
    </div>
  )
}
