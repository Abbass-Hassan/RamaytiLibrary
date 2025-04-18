// src/pages/Dashboard.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand">Ramayti Library Admin</div>
          <div className="navbar-user">
            <span className="user-email">{currentUser?.email}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <h1>Dashboard</h1>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="content-card">
          <p>Welcome to the Ramayti Library Admin Panel!</p>
          <p>You are signed in as: {currentUser?.email}</p>
        </div>
      </main>
    </div>
  );
}
