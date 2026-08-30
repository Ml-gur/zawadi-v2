import { useEffect, useState } from 'react'
import { Bell, BellOff, Clock, Zap, Calendar, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface NotificationPrefs {
  new_listing_alerts: boolean
  notification_frequency: 'instant' | 'daily' | 'weekly' | 'none'
  minimum_match_score: number
}

interface Props {
  userEmail: string
}

const FREQUENCIES = [
  { value: 'instant', label: 'Instant', desc: 'Get notified as soon as a matching scholarship is published', icon: Zap },
  { value: 'daily', label: 'Daily digest', desc: 'One email per day with all new matches', icon: Clock },
  { value: 'weekly', label: 'Weekly digest', desc: 'One email per week with all new matches', icon: Calendar },
  { value: 'none', label: 'Off', desc: 'Stop receiving scholarship notifications', icon: BellOff },
] as const

export default function NotificationSettings({ userEmail }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    new_listing_alerts: true,
    notification_frequency: 'instant',
    minimum_match_score: 50,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadPrefs()
  }, [userEmail])

  async function loadPrefs() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('notification_preferences')
        .select('new_listing_alerts, notification_frequency, minimum_match_score')
        .eq('email', userEmail)
        .maybeSingle()

      if (data) {
        setPrefs({
          new_listing_alerts: data.new_listing_alerts ?? true,
          notification_frequency: data.notification_frequency ?? 'instant',
          minimum_match_score: data.minimum_match_score ?? 50,
        })
      }
    } catch (err) {
      console.error('Failed to load notification prefs:', err)
    } finally {
      setLoading(false)
    }
  }

  async function savePrefs() {
    setSaving(true)
    setSaved(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: session.user.id,
          email: userEmail,
          ...prefs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (!error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error('Failed to save notification prefs:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-pure-white border border-ash rounded-2xl p-6 animate-pulse">
        <div className="h-5 bg-parchment rounded w-48 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-parchment rounded w-full" />
          <div className="h-4 bg-parchment rounded w-3/4" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-pure-white border border-ash rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-ash">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-electric-lime/10 flex items-center justify-center">
            <Bell className="w-4.5 h-4.5 text-off-black-ink" />
          </div>
          <div>
            <h3 className="text-ed-body font-semibold text-off-black-ink">Email Notifications</h3>
            <p className="text-ed-caption text-graphite">Get alerts when new scholarships match your profile</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Master toggle */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-ed-body-sm text-off-black-ink font-medium">Scholarship alerts</span>
          <button
            onClick={() => setPrefs(p => ({ ...p, new_listing_alerts: !p.new_listing_alerts }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${prefs.new_listing_alerts ? 'bg-electric-lime' : 'bg-ash'}`}
            role="switch"
            aria-checked={prefs.new_listing_alerts}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs.new_listing_alerts ? 'translate-x-5' : ''}`} />
          </button>
        </label>

        {prefs.new_listing_alerts && (
          <>
            {/* Frequency */}
            <div>
              <p className="text-ed-body-sm font-medium text-off-black-ink mb-3">How often?</p>
              <div className="grid grid-cols-2 gap-2">
                {FREQUENCIES.map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setPrefs(p => ({ ...p, notification_frequency: value as any }))}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      prefs.notification_frequency === value
                        ? 'border-electric-lime bg-electric-lime/5'
                        : 'border-ash hover:border-graphite'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${prefs.notification_frequency === value ? 'text-off-black-ink' : 'text-graphite'}`} />
                      <span className="text-ed-body-sm font-medium text-off-black-ink">{label}</span>
                    </div>
                    <p className="text-ed-caption text-graphite leading-snug">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum match score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-ed-body-sm font-medium text-off-black-ink">Minimum match score</p>
                <span className="text-ed-body-sm font-mono text-graphite tabular-nums">{prefs.minimum_match_score}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={prefs.minimum_match_score}
                onChange={(e) => setPrefs(p => ({ ...p, minimum_match_score: Number(e.target.value) }))}
                className="w-full h-1.5 bg-ash rounded-full appearance-none cursor-pointer accent-[#466800]"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-graphite">All matches</span>
                <span className="text-[10px] text-graphite">Best matches only</span>
              </div>
            </div>
          </>
        )}

        {/* Save button */}
        <button
          onClick={savePrefs}
          disabled={saving}
          className="w-full rounded-full bg-off-black-ink text-pure-white py-3 text-ed-body-sm font-medium hover:bg-graphite transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : saving ? (
            'Saving…'
          ) : (
            'Save preferences'
          )}
        </button>
      </div>
    </div>
  )
}
