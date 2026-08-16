import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Sidebar from '../components/sidebar';
import './viewlist.css';

interface PatientRecord {
    id: number;
    name: string;
    age?: number;
    gender?: string;
    mrn?: string;
    slotId?: number;
}

const ViewList: React.FC = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const slotId = id ? parseInt(id, 10) : location.state?.slot?.id;

    const [patients, setPatients] = useState<PatientRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [fallback, setFallback] = useState(false);

    useEffect(() => {
        const fetchPatients = async () => {
            if (!slotId) return;
            setLoading(true);
            try {
                const data = await api.getPatientsBySlot(slotId);
                const list = Array.isArray(data) ? data : [];
                if (list.length === 0) {
                    // fallback: show any patients that exist (prefer those with sessionId)
                    try {
                        const all = await api.getAllPatients();
                        const seeded = Array.isArray(all) ? all.filter((p: any) => p.sessionId || p.slotId) : all;
                        setPatients(seeded.length ? seeded : (Array.isArray(all) ? all.slice(0, 10) : []));
                        setFallback(true);
                    } catch (err) {
                        setPatients([]);
                        setFallback(false);
                    }
                } else {
                    setPatients(list);
                    setFallback(false);
                }
            } catch (err) {
                console.error('Failed to load patients for slot', slotId, err);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, [slotId]);

    return (
        <div className="viewlist-page">
            <Sidebar />
            <main className="viewlist-main">
                <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
                <div className="viewlist-header">
                    <h1>Assigned Patients</h1>
                </div>
                {fallback && <div className="fallback-note">Showing fallback patients</div>}

                {loading ? (
                    <div className="loading-state">Loading patients...</div>
                ) : (
                    <div className="patient-table-wrapper">
                        {patients.length === 0 ? (
                            <div className="no-patients">No patients available.</div>
                        ) : (
                            <>
                               
                                <table className="patient-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Age</th>
                                        <th>Gender</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.map(p => (
                                        <tr key={p.id}>
                                            <td>{(p.name || '').replace(/_/g, ' ')}</td>
                                            <td>{p.age ?? '-'}</td>
                                            <td>{p.gender ?? '-'}</td>
                                            <td>
                                                <button
                                                    className="view-profile-btn"
                                                    onClick={() => {
                                                        const fromSlot = location.state?.slot || { id: slotId, source: 'slot' };
                                                        console.debug('Navigating to profile with fromSlot:', fromSlot);
                                                        navigate(`/patients/${p.id}/profile`, { state: { fromSlot } });
                                                    }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ViewList;