import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MovieDetails from "./pages/MovieDetails";
import Showtimes from "./pages/Showtimes";
import SeatSelection from "./pages/SeatSelection";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MyBookings from "./pages/MyBookings";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMovies from "./pages/admin/AdminMovies";
import AdminTheaters from "./pages/admin/AdminTheaters";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/movies/:slug" element={<MovieDetails />} />
      <Route path="/movies/:slug/showtimes" element={<Showtimes />} />
      <Route path="/shows/:showId/seats" element={<SeatSelection />} />
      <Route path="/my-bookings" element={<MyBookings />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/movies"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminMovies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/theaters"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminTheaters />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
