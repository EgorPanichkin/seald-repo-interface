import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Repos from './pages/Repos';
import Environments from './pages/Environments';
import Tree from './pages/Tree';
import SecretEditor from './pages/SecretEditor';
import Verify from './pages/Verify';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="repos" element={<Repos />} />
          <Route path="envs" element={<Environments />} />
          <Route path="tree" element={<Tree />} />
          <Route path="secrets" element={<SecretEditor />} />
          <Route path="verify" element={<Verify />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
