import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/sidebar';
import Schedule from './pages/schedule';
import ViewList from './pages/viewlist';
import Patients from './pages/patients';
import PatientProfile from './pages/patientprofile';
import DoctorProfile from './pages/docprofile';
import './App.css';

function App() {
  console.debug('App mounted — debug banner active.');
  return (
    <div className="app">
      <Sidebar />
      <Routes>
        <Route path="/"                     element={<Schedule />}       />
        <Route path="/schedule"             element={<Schedule />}       />
        <Route path="/view/:id"             element={<ViewList />}       />
        <Route path="/viewlist"             element={<ViewList />}       />
        <Route path="/patients"             element={<Patients />}       />
        <Route path="/patients/:id/profile" element={<PatientProfile />} />
        <Route path="/profile"              element={<DoctorProfile />}  />
      </Routes>
    </div>
  );
}

export default App;
