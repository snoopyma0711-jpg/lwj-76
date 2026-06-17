import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Verify from './pages/Verify'
import Inventory from './pages/Inventory'
import Warnings from './pages/Warnings'
import Stores from './pages/Stores'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/warnings" element={<Warnings />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
