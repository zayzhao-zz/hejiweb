import supabase from '../../../../lib/supabase'

export async function GET() {
  try {
    // 读取营业额表中店铺与时间段的去重列表
    const { data, error } = await supabase.from('营业额').select('店铺, 时间段')
    if (error) throw error

    const shops = Array.from(new Set((data || []).map(r => r['店铺']).filter(Boolean)))
    const timeslots = Array.from(new Set((data || []).map(r => r['时间段']).filter(Boolean)))

    return new Response(JSON.stringify({ shops, timeslots }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
