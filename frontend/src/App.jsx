import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './stages/Dashboard.jsx'
import Profile from './stages/Profile.jsx'
import Assessment from './stages/Assessment.jsx'
import Analysis from './stages/Analysis.jsx'
import Scoring from './stages/Scoring.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new/profile" element={<Profile />} />
        <Route path="/new/assessment/:cid" element={<Assessment />} />
        <Route path="/new/analysis/:cid" element={<Analysis />} />
        <Route path="/new/scoring/:cid" element={<Scoring />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
