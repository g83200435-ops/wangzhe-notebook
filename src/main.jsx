import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AddMatch from './pages/AddMatch.jsx'
import MatchDetail from './pages/MatchDetail.jsx'
import EditMatch from './pages/EditMatch.jsx'
import GrowthProfile from './pages/GrowthProfile.jsx'
import './App.css'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/add', element: <AddMatch /> },
      { path: '/growth', element: <GrowthProfile /> },
      { path: '/matches/:id', element: <MatchDetail /> },
      { path: '/matches/:id/edit', element: <EditMatch /> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
], {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '')
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
