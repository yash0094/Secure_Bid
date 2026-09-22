import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Splash } from './components/Splash'
import { RequireRole } from './components/RequireRole'
import { Shell } from './components/Shell'
import { LoginPage } from './pages/auth/LoginPage'
import { useAuth } from './lib/auth'

import Dashboard from './pages/bidder/Dashboard'
import Discover from './pages/bidder/Discover'
import TenderDetail from './pages/bidder/TenderDetail'
import Pipeline from './pages/bidder/Pipeline'
import Portfolio from './pages/bidder/Portfolio'
import Analytics from './pages/bidder/Analytics'
import Competitors from './pages/bidder/Competitors'
import Screens from './pages/bidder/Screens'
import Parser from './pages/bidder/Parser'
import Alerts from './pages/bidder/Alerts'
import BidderProfile from './pages/bidder/Profile'

import MyTenders from './pages/caller/MyTenders'
import TenderForm from './pages/caller/TenderForm'
import TenderEvaluate from './pages/caller/TenderEvaluate'
import CallerAwards from './pages/caller/Awards'
import CallerProfile from './pages/caller/Profile'

import Overview from './pages/official/Overview'
import Registry from './pages/official/Registry'
import OfficialScreens from './pages/official/Screens'
import OfficialProfile from './pages/official/Profile'

import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'

import Settings from './pages/shared/Settings'
import Help from './pages/shared/Help'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  const home = user.role === 'bidder' ? '/app/dashboard'
    : user.role === 'tender_caller' ? '/buyer/tenders' : '/oversight/overview'
  return <Navigate to={home} replace />
}

const SPLASH_SEEN_KEY = 'securebid_splash_seen'

export default function App() {
  // Shown for a full 3s on a genuinely fresh visit -- but a reload of a
  // deep link (a bookmarked tender, a shared reset-password URL) within the
  // same browser session shouldn't force everyone to sit through the intro
  // again, so it only plays once per session.
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem(SPLASH_SEEN_KEY)
    } catch {
      return true
    }
  })
  useEffect(() => {
    if (!showSplash) return
    const t = setTimeout(() => {
      setShowSplash(false)
      try { sessionStorage.setItem(SPLASH_SEEN_KEY, '1') } catch { /* private mode etc. */ }
    }, 3000)
    return () => clearTimeout(t)
  }, [])

  if (showSplash) return <Splash />

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage role="bidder" />} />
      <Route path="/login/buyer" element={<LoginPage role="tender_caller" />} />
      <Route path="/login/official" element={<LoginPage role="official" />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route path="/app/dashboard" element={<RequireRole role="bidder"><Shell><Dashboard /></Shell></RequireRole>} />
      <Route path="/app/discover" element={<RequireRole role="bidder"><Shell><Discover /></Shell></RequireRole>} />
      <Route path="/app/tenders/:id" element={<RequireRole role="bidder"><Shell><TenderDetail /></Shell></RequireRole>} />
      <Route path="/app/pipeline" element={<RequireRole role="bidder"><Shell><Pipeline /></Shell></RequireRole>} />
      <Route path="/app/portfolio" element={<RequireRole role="bidder"><Shell><Portfolio /></Shell></RequireRole>} />
      <Route path="/app/analytics" element={<RequireRole role="bidder"><Shell><Analytics /></Shell></RequireRole>} />
      <Route path="/app/competitors" element={<RequireRole role="bidder"><Shell><Competitors /></Shell></RequireRole>} />
      <Route path="/app/screens" element={<RequireRole role="bidder"><Shell><Screens /></Shell></RequireRole>} />
      <Route path="/app/parser" element={<RequireRole role="bidder"><Shell><Parser /></Shell></RequireRole>} />
      <Route path="/app/alerts" element={<RequireRole role="bidder"><Shell><Alerts /></Shell></RequireRole>} />
      <Route path="/app/profile" element={<RequireRole role="bidder"><Shell><BidderProfile /></Shell></RequireRole>} />
      <Route path="/app/settings" element={<RequireRole role="bidder"><Shell><Settings /></Shell></RequireRole>} />
      <Route path="/app/help" element={<RequireRole role="bidder"><Shell><Help /></Shell></RequireRole>} />

      <Route path="/buyer/tenders" element={<RequireRole role="tender_caller"><Shell><MyTenders /></Shell></RequireRole>} />
      <Route path="/buyer/tenders/new" element={<RequireRole role="tender_caller"><Shell><TenderForm /></Shell></RequireRole>} />
      <Route path="/buyer/tenders/:id" element={<RequireRole role="tender_caller"><Shell><TenderEvaluate /></Shell></RequireRole>} />
      <Route path="/buyer/awards" element={<RequireRole role="tender_caller"><Shell><CallerAwards /></Shell></RequireRole>} />
      <Route path="/buyer/profile" element={<RequireRole role="tender_caller"><Shell><CallerProfile /></Shell></RequireRole>} />
      <Route path="/buyer/settings" element={<RequireRole role="tender_caller"><Shell><Settings /></Shell></RequireRole>} />
      <Route path="/buyer/help" element={<RequireRole role="tender_caller"><Shell><Help /></Shell></RequireRole>} />

      <Route path="/oversight/overview" element={<RequireRole role="official"><Shell><Overview /></Shell></RequireRole>} />
      <Route path="/oversight/registry" element={<RequireRole role="official"><Shell><Registry /></Shell></RequireRole>} />
      <Route path="/oversight/screens" element={<RequireRole role="official"><Shell><OfficialScreens /></Shell></RequireRole>} />
      <Route path="/oversight/profile" element={<RequireRole role="official"><Shell><OfficialProfile /></Shell></RequireRole>} />
      <Route path="/oversight/settings" element={<RequireRole role="official"><Shell><Settings /></Shell></RequireRole>} />
      <Route path="/oversight/help" element={<RequireRole role="official"><Shell><Help /></Shell></RequireRole>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
