import supabase from '../../../lib/supabase'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const shop = searchParams.get('shop')
    const date = searchParams.get('date')
    const timeslot = searchParams.get('timeslot')



    // 读取指定列并映射为前端友好的字段（id, 店铺, 日期, 时间段, 金额, 交易次数）
    const keyCol = 'key（店铺+年份+月份+时间段）'
    const { data, error } = await supabase
      .from('营业额')
      .select(`"${keyCol}", 店铺, 日期, 时间段, 营业额, 交易次数`)
      .order(`"${keyCol}"`, { ascending: false })

    if (error) throw error

    const mapped = (data || []).map((row) => {
      const rawDate = row['日期']
      let dateStr = null
      if (rawDate) {
        if (typeof rawDate === 'string') dateStr = rawDate.slice(0, 10)
        else if (rawDate instanceof Date) dateStr = rawDate.toISOString().slice(0, 10)
        else dateStr = String(rawDate)
      }

      return {
        id: row[keyCol],
        店铺: row['店铺'] || null,
        日期: dateStr,
        时间段: row['时间段'] || null,
        金额: row['营业额'] ?? null,
        交易次数: row['交易次数'] ?? null,
      }
    })

    return new Response(JSON.stringify({ data: mapped }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 })
    }

    const { data, error } = await supabase.from('营业额').insert([body])
    if (error) throw error

    return new Response(JSON.stringify({ data }), { status: 201 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const body = await req.json()
    const id = body?.id
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id for update' }), { status: 400 })
    }
    const updates = { ...body }
    delete updates.id
    const keyCol = 'key（店铺+年份+月份+时间段）'

    const { data, error } = await supabase.from('营业额').update(updates).eq(keyCol, id)
    if (error) throw error

    return new Response(JSON.stringify({ data }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id for delete' }), { status: 400 })
    }
    const keyCol = 'key（店铺+年份+月份+时间段）'

    const { data, error } = await supabase.from('营业额').delete().eq(keyCol, id)
    if (error) throw error

    return new Response(JSON.stringify({ data }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
