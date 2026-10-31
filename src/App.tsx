import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { WorkspaceProvider } from "./lib/store";
import Dashboard from "./pages/Dashboard";
import JobsPage from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import ResumePage from "./pages/Resume";
import ApplicationsPage from "./pages/Applications";
import InsightsPage from "./pages/Insights";
import Shared from "./pages/Shared";

function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">404</p>
      <h1 className="display mt-2 text-[42px]">This page took a different job.</h1>
      <p className="mt-2 text-[13px] text-[var(--color-muted)]">
        The link may be old. Everything else still works.
      </p>
      <a href="#/" className="btn btn-primary mt-5">
        Back to home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <HashRouter>
        <Routes>
          <Route path="/r/:payload" element={<Shared />} />
          <Route
            path="*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />
                  <Route path="/resume" element={<ResumePage />} />
                  <Route path="/applications" element={<ApplicationsPage />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/shared" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </HashRouter>
    </WorkspaceProvider>
  );
}
