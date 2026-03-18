import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Auth from './Auth.jsx'
import { supabase, supabaseConfigError } from './supabase'

export function Root() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (supabaseConfigError) {
    console.error(supabaseConfigError)

    return (
      <div className="page">
        <div className="error">
          The app is temporarily unavailable right now.
        </div>
      </div>
    )
  }

  if (session === undefined) {
    return <div className="page"><div className="empty">Loading...</div></div>
  }

  return session ? <App session={session} /> : <Auth />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
