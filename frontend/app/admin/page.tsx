'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { request } from '../utils/api';
import { getLocationName } from '../utils/geocoding';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'volunteers' | 'stats' | 'requests'>('reports');
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Data
  const [reports, setReports] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [assignmentRequests, setAssignmentRequests] = useState<any[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Custom Modal
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, children?: React.ReactNode, hideOk?: boolean}>({isOpen: false, title: '', message: ''});
  const closeModal = () => setModalConfig({isOpen: false, title: '', message: ''});

  useEffect(() => {
    // Check local storage for quick bypass in same session
    if (localStorage.getItem('admin_access')) {
      setIsAuthenticated(true);
      fetchAdminData();
    }
    setIsCheckingAuth(false);

    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'reports' || hash === 'volunteers' || hash === 'stats' || hash === 'requests') {
        setActiveTab(hash as any);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real app we would create a special admin auth endpoint, 
      // here we piggy back on the standard token generation.
      const data = await request('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('admin_access', data.access);
      setIsAuthenticated(true);
      fetchAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid Admin Credentials or Server Error');
    }
  }

  const fetchAdminData = async () => {
    try {
      // Temporarily use the standard token for requests in this session
      const token = localStorage.getItem('admin_access');
      localStorage.setItem('access', token || '');

      const repData = await request('/reports/');
      const enhancedReports = await Promise.all(repData.map(async (r: any) => {
         const name = await getLocationName(r.latitude, r.longitude);
         return { ...r, location_name: name };
      }));
      setReports(enhancedReports);

      const volData = await request('/volunteers/');
      setVolunteers(volData);

      const reqData = await request('/assignment-requests/');
      setAssignmentRequests(reqData.filter((r:any) => r.status === 'PENDING'));
    } catch (err: any) {
      console.error(err);
      if(err.message.includes('token')) setIsAuthenticated(false);
    }
  }

  const handleApproveRequest = async (requestId: number) => {
    try {
      await request(`/assignment-requests/${requestId}/approve/`, { method: 'POST' });
      setModalConfig({ isOpen: true, title: 'Success', message: 'Volunteer assigned successfully! Other requests for this issue have been rejected.' });
      fetchAdminData();
    } catch(err: any) {
      setModalConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to approve request.' });
    }
  };

  const handleManualAssign = async (reportId: number, volunteerUserId: number) => {
    try {
       await request(`/reports/${reportId}/`, {
         method: 'PATCH',
         body: JSON.stringify({ 
           status: 'IN_PROGRESS', 
           assigned_volunteer: volunteerUserId 
         })
       });
       setModalConfig({ isOpen: true, title: 'Success', message: 'Report manually assigned successfully!' });
       fetchAdminData();
    } catch(err) {
       setModalConfig({ isOpen: true, title: 'Error', message: 'Failed to manual assign report.' });
    }
  }

  const handleSendNoVolunteerMessage = async (reportId: number) => {
    try {
       const message = "We apologize, but there are no nearby volunteers currently available. We will solve this as soon as any volunteer accepts the issue.";
       await request(`/reports/${reportId}/`, {
         method: 'PATCH',
         body: JSON.stringify({ 
           admin_message: message 
         })
       });
       setModalConfig({ isOpen: true, title: 'Success', message: 'Message sent to user successfully!' });
       fetchAdminData();
    } catch(err) {
       setModalConfig({ isOpen: true, title: 'Error', message: 'Failed to send message.' });
    }
  }

  const handleCustomMessage = (reportId: number) => {
    setModalConfig({
       isOpen: true,
       title: 'Send Custom Message',
       message: 'Enter a message to send to the user for this report:',
       hideOk: true,
       children: (
          <div style={{ marginTop: '15px' }}>
             <textarea 
               id="custom-msg-textarea"
               rows={4}
               placeholder="Type your message here..."
               style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }}
             />
             <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'flex-end' }}>
                <button onClick={closeModal} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button className="btn-primary" onClick={async () => {
                   const val = (document.getElementById('custom-msg-textarea') as HTMLTextAreaElement).value.trim();
                   if (!val) return;
                   
                   closeModal();
                   try {
                      await request(`/reports/${reportId}/`, {
                        method: 'PATCH',
                        body: JSON.stringify({ admin_message: val })
                      });
                      setModalConfig({ isOpen: true, title: 'Success', message: 'Custom message sent to user successfully!' });
                      fetchAdminData();
                   } catch(err) {
                      setModalConfig({ isOpen: true, title: 'Error', message: 'Failed to send Custom message.' });
                   }
                }} style={{ padding: '10px 20px', backgroundColor: '#e67e22', border: 'none' }}>Send To User</button>
             </div>
          </div>
       )
    });
  }

  const handleResolutionMessage = async (reportId: number) => {
    try {
       const msg = "Your reported issue has been successfully resolved! Attached is the proof of resolution from our volunteer. Thank you for using HelpHub.";
       await request(`/reports/${reportId}/`, {
         method: 'PATCH',
         body: JSON.stringify({ admin_message: msg })
       });
       setModalConfig({ isOpen: true, title: 'Success', message: 'Resolution update sent to user!' });
       fetchAdminData();
    } catch(err) {
       setModalConfig({ isOpen: true, title: 'Error', message: 'Failed to send resolution message.' });
    }
  }

  const handleAssign = async (report: any) => {
     try {
        const availableVolunteers = volunteers.filter(v => v.application_status === 'APPROVED' || v.application_status === 'ACCEPTED');
        if (availableVolunteers.length === 0) {
           setModalConfig({ 
             isOpen: true, 
             title: 'No Volunteers Found', 
             message: 'There are no active volunteers available in the system right now.',
             children: (
                <div style={{ marginTop: '1rem' }}>
                   <p>Would you like to notify the user there are no nearby volunteers?</p>
                   <button className="btn-primary" onClick={() => { closeModal(); handleSendNoVolunteerMessage(report.id); }}>Yes, Notify User</button>
                </div>
             )
           });
           return;
        }
        
        const deg2rad = (deg: number) => deg * (Math.PI/180);
        const R = 6371;

        // Calculate distance for all volunteers
        const nearbyVolunteers = availableVolunteers.map(v => {
            const vLat = v.working_area_lat || report.latitude;
            const vLng = v.working_area_long || report.longitude;
            const dLat = deg2rad(report.latitude - vLat);
            const dLon = deg2rad(report.longitude - vLng); 
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(vLat)) * Math.cos(deg2rad(report.latitude)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            const dist = R * c; 
            return { ...v, distance: dist };
        }).sort((a,b) => a.distance - b.distance).filter(v => v.distance <= 50); // Filter within 50km

        if (nearbyVolunteers.length === 0) {
            setModalConfig({ isOpen: true, title: 'No Nearby Volunteers', message: 'No volunteers found within 50km of this issue.' });
            return;
        }

        if (nearbyVolunteers.length === 1) {
            // Only one volunteer, auto assign
            const nearestVolunteer = nearbyVolunteers[0].user;
            await request(`/reports/${report.id}/`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'IN_PROGRESS', assigned_volunteer: nearestVolunteer.id })
            });
            setModalConfig({ isOpen: true, title: 'Auto-Assigned Successfully', message: `Report automatically assigned to ${nearestVolunteer.first_name || nearestVolunteer.username} (Proximity: ${nearbyVolunteers[0].distance.toFixed(1)} km)` });
            fetchAdminData();
        } else {
            // Multiple nearby volunteers > 1, show picker
            setModalConfig({
               isOpen: true,
               title: 'Multiple Volunteers Nearby',
               message: 'There are multiple capable volunteers nearby. Who do you want to assign this issue to?',
               children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                     {nearbyVolunteers.slice(0, 5).map(nv => (
                        <button key={nv.id} style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '5px', cursor: 'pointer' }} onClick={async () => {
                            closeModal();
                            try {
                              await request(`/reports/${report.id}/`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: 'IN_PROGRESS', assigned_volunteer: nv.user.id })
                              });
                              setModalConfig({ isOpen: true, title: 'Assigned Successfully', message: `Report assigned to ${nv.user.first_name || nv.user.username}.` });
                              fetchAdminData();
                            } catch(err) {
                              setModalConfig({ isOpen: true, title: 'Error', message: 'Failed to assign volunteer.'});
                            }
                        }}>
                           <span style={{ fontWeight: 'bold' }}>{nv.user.first_name || nv.user.username} ({nv.user.city})</span>
                           <span style={{ color: 'var(--success)' }}>{nv.distance.toFixed(1)} km</span>
                        </button>
                     ))}
                  </div>
               )
            });
        }
     } catch(err) {
        setModalConfig({ isOpen: true, title: 'Error', message: 'Failed to process assignment.' });
     }
  };

  const handleVolunteerAction = async (id: number, action: 'Accept' | 'Reject') => {
    try {
       await request(`/volunteers/${id}/`, {
         method: 'PATCH',
         body: JSON.stringify({ 
           application_status: action === 'Accept' ? 'APPROVED' : 'REJECTED',
           is_approved: action === 'Accept' 
         })
       });
       setModalConfig({ isOpen: true, title: 'Success', message: `Volunteer application marked as ${action}ed.` });
       fetchAdminData();
    } catch(err) {
       setModalConfig({ isOpen: true, title: 'Error', message: 'Failed to update volunteer status.' });
    }
  };

  if (isCheckingAuth) return <main style={{ minHeight: '100vh', backgroundColor: 'var(--surface)' }}></main>;

  if (!isAuthenticated) {
     return (
        <main className="fade-in" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>Admin Secured Login</h2>
            {loginError && <p style={{ color: 'var(--error)', textAlign: 'center' }}>{loginError}</p>}
            <form onSubmit={handleAdminLogin} autoComplete="off">
              <div style={{ marginBottom: '1rem' }}>
                <input type="text" placeholder="Username" name="admin_user_login" required value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <input type="password" placeholder="Password" name="admin_pass_login" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <button disabled={!username || !password} className="btn-primary" type="submit" style={{ width: '100%' }}>Login</button>
            </form>
            <div style={{ textAlign: 'center' }}>
              <a href="/access" style={{ color: 'var(--text-muted)' }}>← Back to Options</a>
            </div>
          </div>
        </main>
     )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-main)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary)' }}>🏛️ Admin Control Center</h1>
        <button onClick={fetchAdminData} style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          🔄 Refresh Data
        </button>
      </header>

      {/* Tabs removed for global hamburger nav */}

      <div style={{ padding: '2rem', flex: 1 }}>
        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          
          {activeTab === 'reports' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>LIVE Reported Issues</h2>
                <select style={{ width: '200px', marginBottom: 0 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                 {reports.filter(r => filterStatus === 'ALL' || r.status === filterStatus).length === 0 && <p>No real reports found matching criteria.</p>}
                {reports.filter(r => filterStatus === 'ALL' || r.status === filterStatus).map(report => (
                  <div key={report.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 'bold' }}>Report #{report.id}</span>
                      <span style={{ backgroundColor: report.status === 'PENDING' ? '#e74c3c' : '#f39c12', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {report.status}
                      </span>
                    </div>
                    
                    {(() => {
                      const textParts = report.text ? report.text.split('[Text]:') : ['', ''];
                      const voicePart = textParts[0].replace('[Voice]:', '').trim();
                      const manualPart = textParts.length > 1 ? textParts[1].trim() : '';

                      return (
                        <div style={{ margin: '15px 0' }}>
                          {voicePart && (
                            <div style={{ marginBottom: '10px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
                              <strong style={{ display: 'inline-block', marginBottom: '5px' }}>🎤 Voice Transcript:</strong>
                              <p style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{voicePart}</p>
                            </div>
                          )}

                          {report.original_audio && (
                            <div style={{ marginBottom: '10px' }}>
                              <audio src={report.original_audio.startsWith('http') || report.original_audio.startsWith('data:') ? report.original_audio : `http://127.0.0.1:8000${report.original_audio}`} controls style={{ width: '100%', height: '40px' }} />
                            </div>
                          )}

                          {manualPart && (
                            <div style={{ marginBottom: '10px' }}>
                              <strong>📝 Description:</strong>
                              <p style={{ margin: '5px 0', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{manualPart}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    {report.photo && <img src={report.photo.startsWith('http') || report.photo.startsWith('data:') ? report.photo : `http://127.0.0.1:8000${report.photo}`} alt="Report Image" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '5px', marginBottom: '10px' }} />}
                    
                    {(report.contact_info || report.user_details?.email || report.user_details?.username) && (
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '5px 10px', marginTop: '10px', borderRadius: '4px', fontSize: '0.85rem' }}>
                        <strong>User Contact Info:</strong> {report.contact_info || report.user_details?.email || report.user_details?.username}
                      </div>
                    )}
                    {report.admin_message && (
                      <div style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', padding: '5px 10px', marginTop: '5px', borderRadius: '4px', fontSize: '0.85rem', color: '#d35400', borderLeft: '3px solid #f1c40f' }}>
                        <strong>Message Sent:</strong> {report.admin_message}
                      </div>
                    )}

                    <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '10px', borderRadius: '5px', margin: '10px 0' }}>
                      <strong>📍 {report.location_name}</strong><br/>
                      <span style={{ fontSize: '0.8rem' }}>Lat {report.latitude?.toFixed(4)}, Lng {report.longitude?.toFixed(4)}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px', marginBottom: '10px' }}>
                       <button onClick={() => handleCustomMessage(report.id)} style={{ flex: 1, padding: '8px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                         ✍️ Send Custom Message
                       </button>
                    </div>

                    {report.resolved_proof && (
                      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(46, 204, 113, 0.1)', borderRadius: '8px', border: '1px solid var(--success)' }}>
                        <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '8px' }}>📸 Resolution Proof:</strong>
                        {report.resolved_proof.match(/\.(mp4|webm|ogg)$/i) ? (
                          <video src={report.resolved_proof.startsWith('http') || report.resolved_proof.startsWith('data:') ? report.resolved_proof : `http://127.0.0.1:8000${report.resolved_proof}`} controls style={{ width: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                        ) : (
                          <img src={report.resolved_proof.startsWith('http') || report.resolved_proof.startsWith('data:') ? report.resolved_proof : `http://127.0.0.1:8000${report.resolved_proof}`} alt="Resolution Proof" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }} />
                        )}
                        {report.status === 'RESOLVED' && (
                           <button onClick={() => handleResolutionMessage(report.id)} style={{ marginTop: '10px', width: '100%', padding: '10px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                             📨 Send Resolution Update to User
                           </button>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                      {report.assigned_volunteer_details ? (
                        <div style={{ flex: 1, padding: '10px', backgroundColor: 'var(--success)', color: 'white', borderRadius: '5px', textAlign: 'center', fontWeight: 'bold' }}>
                          👨‍🔧 Assigned to: {report.assigned_volunteer_details.first_name || report.assigned_volunteer_details.username}
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: '5px' }}>
                             <select id={`assign-select-${report.id}`} style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '5px', backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}>
                               <option value="" style={{ color: '#000', backgroundColor: '#fff' }}>Manual Assign Volunteer...</option>
                               {volunteers.filter(v => v.application_status === 'APPROVED' || v.application_status === 'ACCEPTED').map(v => {
                                 let distStr = '';
                                 if (v.working_area_lat && v.working_area_long && report.latitude && report.longitude) {
                                    const deg2rad = (deg: number) => deg * (Math.PI/180);
                                    const R = 6371;
                                    const dLat = deg2rad(report.latitude - v.working_area_lat);
                                    const dLon = deg2rad(report.longitude - v.working_area_long); 
                                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(v.working_area_lat)) * Math.cos(deg2rad(report.latitude)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
                                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
                                    const dist = R * c; 
                                    distStr = ` - ${dist.toFixed(1)} km away`;
                                 }
                                 return (
                                   <option key={v.id} value={v.user.id} style={{ color: '#000', backgroundColor: '#fff' }}>{v.user.first_name || v.user.username} ({v.user.city}{distStr})</option>
                                 );
                               })}
                             </select>
                             <button className="btn-primary" onClick={() => {
                               const selectEl = document.getElementById(`assign-select-${report.id}`) as HTMLSelectElement;
                               if(selectEl && selectEl.value) handleManualAssign(report.id, parseInt(selectEl.value));
                               else setModalConfig({ isOpen: true, title: 'Warning', message: 'Please select a volunteer from the dropdown to assign manually.' });
                             }} style={{ padding: '10px' }}>Assign</button>
                          </div>

                          <button className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.9rem', backgroundColor: '#3498db' }} onClick={() => handleAssign(report)}>
                            🤖 Auto-Assign Nearby
                          </button>

                          <button style={{ flex: 1, padding: '10px', fontSize: '0.85rem', backgroundColor: 'var(--error)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleSendNoVolunteerMessage(report.id)}>
                            ✉️ Notify User: No Nearby Volunteers
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'volunteers' && (
            <div className="fade-in glass-card">
              <h2>Pending Volunteer Applications</h2>
              <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '10px' }}>
              <table style={{ minWidth: '600px', width: '100%', textAlign: 'left', marginTop: '1rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px' }}>Volunteer / Application ID</th>
                    <th style={{ padding: '10px' }}>Application Status</th>
                    <th style={{ padding: '10px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.filter(v => v.application_status === 'PENDING').length === 0 && <tr><td colSpan={3} style={{ padding: '10px' }}>No pending applications.</td></tr>}
                  {volunteers.filter(v => v.application_status === 'PENDING').map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px' }}>
                        <strong>{v.user?.first_name || v.user?.username || 'No Name Provided'}</strong><br/>
                        <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>ID: {v.user?.username}</span><br/>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>City: {v.user?.city} | Age: {v.user?.age}</span>
                      </td>
                      <td style={{ padding: '10px', color: 'orange' }}>
                        <strong>{v.application_status}</strong>
                        {v.resume && <div><a href={v.resume.startsWith('http') || v.resume.startsWith('data:') ? v.resume : `http://127.0.0.1:8000${v.resume}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>📄 View Resume</a></div>}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button onClick={() => handleVolunteerAction(v.id, 'Accept')} style={{ padding: '5px 10px', backgroundColor: 'var(--success)', color: 'white', border: 'none', cursor: 'pointer', marginRight: '5px', borderRadius: '5px' }}>Approve</button>
                        <button onClick={() => handleVolunteerAction(v.id, 'Reject')} style={{ padding: '5px 10px', backgroundColor: 'var(--error)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <h2 style={{ marginTop: '3rem' }}>Shortlisted & Checked Applications</h2>
              <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '10px' }}>
              <table style={{ minWidth: '600px', width: '100%', textAlign: 'left', marginTop: '1rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px' }}>Volunteer / Application ID</th>
                    <th style={{ padding: '10px' }}>Application Status</th>
                    <th style={{ padding: '10px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.filter(v => v.application_status !== 'PENDING').length === 0 && <tr><td colSpan={3} style={{ padding: '10px' }}>No shortlisted volunteers yet.</td></tr>}
                  {volunteers.filter(v => v.application_status !== 'PENDING').map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px' }}>
                        <strong>{v.user?.first_name || v.user?.username || 'No Name Provided'}</strong><br/>
                        <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>ID: {v.user?.username}</span><br/>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>City: {v.user?.city} | Age: {v.user?.age}</span>
                      </td>
                      <td style={{ padding: '10px', color: v.application_status === 'APPROVED' ? 'var(--success)' : 'var(--error)' }}>
                        <strong>{v.application_status}</strong>
                        {v.resume && <div><a href={v.resume.startsWith('http') || v.resume.startsWith('data:') ? v.resume : `http://127.0.0.1:8000${v.resume}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>📄 View Resume</a></div>}
                      </td>
                      <td style={{ padding: '10px' }}>
                         <span style={{ color: 'var(--text-muted)' }}>Decision Made</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Pending Assignment Requests</h2>
              </div>
              
              {(() => {
                const requestsByReport = assignmentRequests.reduce((acc, req) => {
                  const rId = req.report_details.id;
                  if (!acc[rId]) acc[rId] = { report: req.report_details, requests: [] };
                  acc[rId].requests.push(req);
                  return acc;
                }, {} as Record<number, { report: any, requests: any[] }>);

                if (Object.keys(requestsByReport).length === 0) {
                  return <p className="glass-card">No pending assignment requests from volunteers.</p>;
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {Object.values(requestsByReport).map((group: any) => (
                      <div key={group.report.id} className="glass-card" style={{ padding: '20px', borderLeft: '5px solid var(--primary)' }}>
                        <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.2rem', display: 'block', marginBottom: '10px' }}>Issue #{group.report.id}</span>
                          
                          {(() => {
                            const textParts = group.report.text ? group.report.text.split('[Text]:') : ['', ''];
                            const voicePart = textParts[0].replace('[Voice]:', '').trim();
                            const manualPart = textParts.length > 1 ? textParts[1].trim() : '';

                            return (
                              <div style={{ margin: '15px 0' }}>
                                {voicePart && (
                                  <div style={{ marginBottom: '10px', backgroundColor: 'var(--surface)', padding: '10px', borderRadius: '5px', border: '1px solid var(--border)' }}>
                                    <strong style={{ display: 'inline-block', marginBottom: '5px' }}>🎤 Voice Transcript:</strong>
                                    <p style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{voicePart}</p>
                                  </div>
                                )}

                                {group.report.original_audio && (
                                  <div style={{ marginBottom: '10px' }}>
                                    <audio src={group.report.original_audio.startsWith('http') || group.report.original_audio.startsWith('data:') ? group.report.original_audio : `http://127.0.0.1:8000${group.report.original_audio}`} controls style={{ width: '100%', height: '40px' }} />
                                  </div>
                                )}

                                {manualPart && (
                                  <div style={{ marginBottom: '10px' }}>
                                    <strong>📝 Description:</strong>
                                    <p style={{ margin: '5px 0', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{manualPart}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          
                          {group.report.photo && <img src={group.report.photo.startsWith('http') || group.report.photo.startsWith('data:') ? group.report.photo : `http://127.0.0.1:8000${group.report.photo}`} alt="Report Image" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '5px', marginBottom: '10px' }} />}

                          <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '10px', borderRadius: '5px', display: 'inline-block' }}>
                             <strong>📍 {group.report.location_name || 'Location'}</strong><br/>
                             <span style={{ fontSize: '0.8rem' }}>Lat {group.report.latitude?.toFixed(4)}, Lng {group.report.longitude?.toFixed(4)}</span>
                          </div>
                        </div>
                        
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Interested Volunteers ({group.requests.length})</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                           {group.requests.map((req: any) => (
                             <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                               <div>
                                 <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-main)' }}>{req.volunteer_details?.first_name || req.volunteer_details?.username}</strong>
                                 <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>City: {req.volunteer_details?.city} | Age: {req.volunteer_details?.age}</span>
                               </div>
                               <button className="btn-primary" onClick={() => handleApproveRequest(req.id)} style={{ backgroundColor: 'var(--success)', padding: '8px 20px' }}>
                                 ✅ Approve
                               </button>
                             </div>
                           ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Global Custom Modal Popups */}
      {modalConfig.isOpen && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
            <div className="fade-in" style={{ width: '90%', maxWidth: '500px', backgroundColor: 'var(--background)', padding: '2rem', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
               <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>{modalConfig.title}</h2>
               <p style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: '1.5' }}>{modalConfig.message}</p>
               {modalConfig.children}
               {!modalConfig.hideOk && (
                 <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                   <button className="btn-primary" onClick={closeModal} style={{ backgroundColor: 'var(--primary)' }}>OK</button>
                 </div>
               )}
            </div>
         </div>
      )}
    </main>
  );
}
