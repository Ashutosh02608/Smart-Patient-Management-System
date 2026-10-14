'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useSearchParams } from 'next/navigation';
import AiSymptomTriage from '@/components/AiSymptomTriage';

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
];

function PatientDashboardContent() {
  const { user, refresh } = useAuth();
  
  // Data States
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form States (Booking)
  const [bookDoctorId, setBookDoctorId] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookReason, setBookReason] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Profile Edit States
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('Not Specified');
  const [editBloodGroup, setEditBloodGroup] = useState('Not Specified');
  const [editAllergies, setEditAllergies] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Reschedule States
  const [reschedulingApt, setReschedulingApt] = useState(null);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');
  const [reschedError, setReschedError] = useState('');
  const [reschedSuccess, setReschedSuccess] = useState('');
  const [reschedLoading, setReschedLoading] = useState(false);

  // Billing Checkout States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState('card'); // 'card' | 'upi'
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [payingInvoice, setPayingInvoice] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Secure Messaging States
  const [selectedChatDoctor, setSelectedChatDoctor] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Printing Layout State
  const [printItem, setPrintItem] = useState(null);

  // Tabs navigation
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (tabParam) {
      const timer = setTimeout(() => {
        setActiveTab(tabParam);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [tabParam]);

  const isSlotBooked = (date, time, doctorId) => {
    return appointments.some(a => a.date === date && a.time === time && a.doctorId === doctorId && a.status !== 'cancelled');
  };

  // Generate visual timeline of next 10 days
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      
      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(nextDate.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      
      dates.push({
        key,
        dayNum: nextDate.getDate(),
        dayName: nextDate.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: nextDate.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
    return dates;
  };

  // Fetch Dashboard Data
  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [aptRes, recRes, docRes, billRes, labRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/records'),
        fetch('/api/users?role=doctor'),
        fetch('/api/billing'),
        fetch('/api/lab-reports')
      ]);

      if (aptRes.ok && recRes.ok && docRes.ok) {
        const apts = await aptRes.json();
        const recs = await recRes.json();
        const docs = await docRes.json();
        const bills = billRes.ok ? await billRes.json() : [];
        const labs = labRes.ok ? await labRes.json() : [];
        
        setAppointments(apts.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setRecords(recs.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setDoctors(docs);
        setInvoices(bills.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setLabReports(labs.sort((a, b) => new Date(b.date) - new Date(a.date)));

        // Prepopulate profile edit form
        if (user && user.profile) {
          setEditPhone(user.profile.phone || '');
          setEditDob(user.profile.dob || '');
          setEditGender(user.profile.gender || 'Not Specified');
          setEditBloodGroup(user.profile.bloodGroup || 'Not Specified');
          setEditAllergies(user.profile.allergies || 'None');
          setEditEmergency(user.profile.emergencyContact || '');
        }
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    if (user) {
      setTimeout(() => {
        if (active) fetchData();
      }, 0);
    }
    return () => {
      active = false;
    };
  }, [user, fetchData]);

  // Secure Messaging fetch/poll setup
  const fetchMessages = useCallback(async (docId) => {
    if (!docId) return;
    try {
      const res = await fetch(`/api/messages?recipientId=${docId}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'messages' || !selectedChatDoctor) return;
    
    setTimeout(() => {
      fetchMessages(selectedChatDoctor.id);
    }, 0);

    let interval;
    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (!document.hidden) {
          fetchMessages(selectedChatDoctor.id);
        }
      }, 3000);
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
        interval = null;
      } else {
        fetchMessages(selectedChatDoctor.id);
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab, selectedChatDoctor, fetchMessages]);

  // Auto-scroll chat window
  useEffect(() => {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages]);

  const selectDoctorChat = (doc) => {
    setSelectedChatDoctor(doc);
    setChatMessages([]);
    fetchMessages(doc.id);
  };

  const refreshMessages = () => {
    if (selectedChatDoctor) fetchMessages(selectedChatDoctor.id);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedChatDoctor || sendingMsg) return;

    setSendingMsg(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedChatDoctor.id,
          content: newMessageText.trim()
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setChatMessages(prev => [...prev, newMsg]);
        setNewMessageText('');
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMsg(false);
    }
  };

  // Book Appointment Submission
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');
    
    if (!bookDoctorId || !bookDate || !bookTime) {
      setBookingError('Doctor, date, and time are required.');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: bookDoctorId,
          date: bookDate,
          time: bookTime,
          reason: bookReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment');

      setBookingSuccess('Appointment booked successfully!');
      setBookDoctorId('');
      setBookDate('');
      setBookTime('');
      setBookReason('');
      
      fetchData();
      setTimeout(() => setActiveTab('dashboard'), 1500);
    } catch (err) {
      setBookingError(err.message || 'An error occurred.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Update Profile Submission
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          profile: {
            phone: editPhone,
            dob: editDob,
            gender: editGender,
            bloodGroup: editBloodGroup,
            allergies: editAllergies,
            emergencyContact: editEmergency
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfileSuccess('Profile updated successfully!');
      await refresh();
      fetchData();
    } catch (err) {
      setProfileError(err.message || 'An error occurred.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Cancel Appointment handler
  const handleCancelAppointment = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'cancelled' })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
    }
  };

  // Reschedule Appointment handler
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setReschedError('');
    setReschedSuccess('');

    if (!reschedulingApt || !reschedDate || !reschedTime) {
      setReschedError('Date and time slot are required.');
      return;
    }

    setReschedLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reschedulingApt.id,
          date: reschedDate,
          time: reschedTime
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reschedule appointment');

      setReschedSuccess('Rescheduled successfully! Pending staff review.');
      setTimeout(() => {
        setReschedulingApt(null);
        setReschedDate('');
        setReschedTime('');
        setReschedSuccess('');
        fetchData();
      }, 1500);
    } catch (err) {
      setReschedError(err.message || 'An error occurred.');
    } finally {
      setReschedLoading(false);
    }
  };

  // Checkout operations
  const openCheckout = (inv) => {
    setSelectedInvoice(inv);
    setCheckoutOpen(true);
    setCardName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setPaymentSuccess(false);
    setPaymentError('');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (cardNumber.replace(/\s/g, '').length < 15) {
      setPaymentError('Please enter a valid credit card number.');
      return;
    }
    if (cardExpiry.length < 5) {
      setPaymentError('Please enter card expiration date (MM/YY).');
      return;
    }
    if (cardCvv.length < 3) {
      setPaymentError('Please enter a valid CVV.');
      return;
    }

    setPayingInvoice(true);
    setPaymentError('');

    try {
      const res = await fetch('/api/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInvoice.id,
          status: 'paid'
        })
      });

      if (res.ok) {
        setPaymentSuccess(true);
        fetchData();
      } else {
        const errData = await res.json();
        setPaymentError(errData.error || 'Payment transaction rejected.');
      }
    } catch (err) {
      setPaymentError('Connection error to payment processors.');
      console.error(err);
    } finally {
      setPayingInvoice(false);
    }
  };

  const simulateUPISuccess = async () => {
    if (!selectedInvoice) return;
    setPayingInvoice(true);
    setPaymentError('');

    try {
      const res = await fetch('/api/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInvoice.id,
          status: 'paid'
        })
      });

      if (res.ok) {
        setPaymentSuccess(true);
        fetchData();
      } else {
        const errData = await res.json();
        setPaymentError(errData.error || 'UPI verification failure.');
      }
    } catch (err) {
      setPaymentError('UPI Merchant callback timeout.');
      console.error(err);
    } finally {
      setPayingInvoice(false);
    }
  };

  // Printing Action
  const handlePrint = (type, data) => {
    setPrintItem({ type, data });
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'confirmed': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'scheduled': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'waiting': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'in-consultation': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-505/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  // Filters based on searchQuery
  const filteredAppointments = appointments.filter(a =>
    a.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.profile?.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecords = records.filter(r =>
    r.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.doctorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingAppointments = appointments.filter(a => ['scheduled', 'waiting', 'in-consultation'].includes(a.status));

  return (
    <>
      <div className="print:hidden">
        <DashboardLayout
          roleTitle="Patient Portal"
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSearchQuery('');
          }}
          badges={{ appointments: pendingAppointments.length }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            activeTab === 'dashboard' ? 'Search scheduled slots...' :
            activeTab === 'ai-triage' ? 'Search clinical guidance and symptoms...' :
            activeTab === 'patients' ? 'Search clinical doctors...' :
            activeTab === 'appointments' ? 'Search consultation logs...' :
            activeTab === 'reports' ? 'Search medical records...' :
            activeTab === 'billing' ? 'Search invoice statements...' :
            activeTab === 'lab-reports' ? 'Search laboratory results...' :
            'Search workspace settings...'
          }
        >
          {loadingData ? (
            <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
              <p className="text-zinc-500 text-sm">Syncing clinic database records...</p>
            </div>
          ) : (
            <>
              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Health Summary Card */}
                  <div className="bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-zinc-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <span className="text-xs text-zinc-550 uppercase tracking-wider block font-sans">Allergies Warning</span>
                      <span className={`text-sm font-semibold truncate block ${user?.profile?.allergies && user.profile.allergies !== 'None' ? 'text-rose-400' : 'text-zinc-400'}`}>
                        {user?.profile?.allergies || 'None recorded'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-zinc-550 uppercase tracking-wider block font-sans">Blood Group</span>
                      <span className="text-sm font-semibold text-white block">
                        {user?.profile?.bloodGroup || 'Not set'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-zinc-550 uppercase tracking-wider block font-sans">Emergency Contact</span>
                      <span className="text-sm font-semibold text-zinc-300 block truncate">
                        {user?.profile?.emergencyContact || 'Not configured'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-zinc-550 uppercase tracking-wider block font-sans">Quick Action</span>
                      <button
                        onClick={() => setActiveTab('appointments')}
                        className="text-xs font-bold text-cyan-405 hover:text-cyan-300 transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <span>📅 Book Consultation</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Assistant Quick Action Banner */}
                  <div className="relative overflow-hidden bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-indigo-950/40 border border-cyan-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-cyan-500/5">
                    <div className="space-y-1">
                      <div className="inline-flex items-center space-x-1.5 text-cyan-400 text-xs font-bold">
                        <span className="animate-pulse">✨</span>
                        <span>CarePulse AI Clinical Assistant</span>
                      </div>
                      <h3 className="text-sm font-bold text-white">Feeling unwell? Check symptoms & prepare for your consult</h3>
                      <p className="text-xs text-zinc-400 max-w-xl">
                        Get an instant AI urgency rating, specialty match, and prepare a structured pre-consultation brief for your doctor.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('ai-triage')}
                      className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Start AI Triage &rarr;
                    </button>
                  </div>

                  {/* Scheduled Appointments Table */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>📅</span> <span>Upcoming Booked Appointments</span>
                      </h3>
                      <span className="text-xs text-zinc-550">{pendingAppointments.length} Active booking(s)</span>
                    </div>

                    {pendingAppointments.length === 0 ? (
                      <div className="p-12 text-center text-zinc-500 text-xs space-y-3">
                        <p>You have no pending appointments scheduled.</p>
                        <button
                          onClick={() => setActiveTab('appointments')}
                          className="py-1.5 px-4 rounded-xl bg-cyan-955 text-cyan-400 font-semibold border border-cyan-800 hover:bg-cyan-900 text-xs transition-colors cursor-pointer"
                        >
                          Book a Consultation Slot
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                              <th className="p-4">Physician</th>
                              <th className="p-4">Schedule Date</th>
                              <th className="p-4">Time Slot</th>
                              <th className="p-4">Chief Complaint / Notes</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850">
                            {pendingAppointments.map((apt) => (
                              <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                                <td className="p-4 font-semibold text-white">Dr. {apt.doctorName}</td>
                                <td className="p-4 text-zinc-300 font-mono">{apt.date}</td>
                                <td className="p-4 text-zinc-300 font-mono">{apt.time}</td>
                                <td className="p-4 text-zinc-400 max-w-xs truncate">{apt.reason || 'General checkup'}</td>
                                <td className="p-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusClass(apt.status)}`}>
                                    {apt.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end space-x-3">
                                    {['scheduled', 'waiting', 'pending', 'confirmed'].includes(apt.status) && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setReschedulingApt(apt);
                                            setReschedDate(apt.date || '');
                                            setReschedTime(apt.time || '');
                                          }}
                                          className="text-xs font-bold text-cyan-405 hover:text-cyan-300 transition-colors cursor-pointer"
                                        >
                                          Reschedule
                                        </button>
                                        <button
                                          onClick={() => handleCancelAppointment(apt.id)}
                                          className="text-xs font-bold text-rose-455 hover:text-rose-350 transition-colors cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DOCTORS DIRECTORY TAB */}
              {activeTab === 'patients' && (
                <div className="space-y-6">
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                      <h3 className="text-sm font-bold text-white">Available Consulting Doctors Directory</h3>
                      <span className="text-xs text-zinc-550">{filteredDoctors.length} Doctors(s) listed</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                      {filteredDoctors.length === 0 ? (
                        <p className="text-xs text-zinc-550 col-span-2 text-center p-4 italic">No consulting physicians found.</p>
                      ) : (
                        filteredDoctors.map((doc) => (
                          <div key={doc.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex items-center justify-between">
                            <div className="space-y-1">
                              <strong className="text-white text-xs block">Dr. {doc.name}</strong>
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold font-mono capitalize">
                                {doc.profile?.specialization || 'General Consultation'}
                              </span>
                              <span className="block text-[10px] text-zinc-500 mt-1 font-sans">Cabinet: {doc.profile?.room || '101-A'}</span>
                            </div>
                            <button
                              onClick={() => {
                                setBookDoctorId(doc.id);
                                setActiveTab('appointments');
                              }}
                              className="py-1 px-3 bg-indigo-955 hover:bg-indigo-900 border border-indigo-850 text-indigo-300 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                            >
                              Book Slot
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* APPOINTMENTS & SCHEDULER TAB */}
              {activeTab === 'appointments' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-white">Schedule Doctor Appointment Booking</h3>
                          <p className="text-xs text-zinc-450">Select doctor, set date/time slots, and describe symptoms.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('ai-triage')}
                          className="py-1.5 px-3 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-300 hover:bg-cyan-900/60 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                        >
                          <span className="animate-pulse">✨</span>
                          <span>Pre-fill with AI Triage</span>
                        </button>
                      </div>

                      {bookingError && (
                        <div className="bg-rose-955/40 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs">
                          {bookingError}
                        </div>
                      )}

                      {bookingSuccess && (
                        <div className="bg-emerald-955/40 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-xs">
                          {bookingSuccess}
                        </div>
                      )}

                      <form onSubmit={handleBookAppointment} className="space-y-4 font-sans">
                        <div className="space-y-1">
                          <label htmlFor="book-doctor" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Consultant Physician *</label>
                          <select
                            id="book-doctor"
                            className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-150 text-xs focus:outline-none"
                            value={bookDoctorId}
                            onChange={(e) => {
                              setBookDoctorId(e.target.value);
                              setBookDate('');
                              setBookTime('');
                            }}
                          >
                            <option value="">-- Choose Consulting MD --</option>
                            {doctors.map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                Dr. {doc.name} ({doc.profile?.specialization || 'General'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Visual Booking Calendar & Slots Timeline */}
                        {bookDoctorId && (
                          <div className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-sans">
                                Choose Consultation Date *
                              </label>
                              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                                {getAvailableDates().map((d) => {
                                  const isSelected = bookDate === d.key;
                                  return (
                                    <button
                                      key={d.key}
                                      type="button"
                                      onClick={() => {
                                        setBookDate(d.key);
                                        setBookTime('');
                                      }}
                                      className={`flex-none w-16 p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border-cyan-505 text-cyan-400 shadow-md shadow-cyan-500/10'
                                          : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                                      }`}
                                    >
                                      <span className="text-[9px] uppercase font-bold tracking-wider">{d.dayName}</span>
                                      <span className="text-lg font-extrabold">{d.dayNum}</span>
                                      <span className="text-[8px] uppercase tracking-widest">{d.monthName}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {bookDate && (
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-sans">
                                  Select Available Time Slot *
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                  {TIME_SLOTS.map((slot) => {
                                    const taken = isSlotBooked(bookDate, slot, bookDoctorId);
                                    const selected = bookTime === slot;
                                    return (
                                      <button
                                        key={slot}
                                        type="button"
                                        disabled={taken}
                                        onClick={() => setBookTime(slot)}
                                        className={`py-2 px-1 text-center rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                                          selected 
                                            ? 'bg-cyan-500 text-zinc-950 border-cyan-405 shadow-sm font-extrabold'
                                            : taken
                                            ? 'bg-zinc-900/40 text-zinc-600 border-zinc-900/60 line-through cursor-not-allowed opacity-30'
                                            : 'bg-zinc-950 text-zinc-300 border-zinc-850 hover:border-zinc-700 hover:text-white'
                                        }`}
                                      >
                                        {slot}
                                      </button>
                                    );
                                  })}
                                </div>
                                {bookTime && (
                                  <div className="text-[10px] text-cyan-400 font-semibold mt-1 font-sans">
                                    ✓ Selected Slot: {bookDate} @ {bookTime}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-1">
                          <label htmlFor="book-reason" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chief Complaint Reason</label>
                          <input
                            id="book-reason"
                            type="text"
                            placeholder="e.g. Sore throat and persistent fever"
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-150 text-xs focus:outline-none"
                            value={bookReason}
                            onChange={(e) => setBookReason(e.target.value)}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={bookingLoading}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {bookingLoading ? 'Submitting Booking Slot...' : 'Schedule Appointment'}
                        </button>
                      </form>
                    </div>

                    {/* Booking Stats Side Card */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
                      <h4 className="text-[10px] font-bold text-white uppercase tracking-wider text-indigo-400">Booking Summary</h4>
                      <div className="space-y-3.5 text-xs text-zinc-400">
                        <div className="flex justify-between border-b border-zinc-850 pb-2">
                          <span>Total Booked</span>
                          <span className="font-semibold text-white">{appointments.length}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-850 pb-2">
                          <span>Completed Consults</span>
                          <span className="font-semibold text-white text-emerald-400">
                            {appointments.filter(a => a.status === 'completed').length}
                          </span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span>Cancelled Consults</span>
                          <span className="font-semibold text-white text-rose-400">
                            {appointments.filter(a => a.status === 'cancelled').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Complete Booking History */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                      <h3 className="text-sm font-bold text-white">All Booked Consultations History</h3>
                      <span className="text-xs text-zinc-550">{filteredAppointments.length} Booking(s) found</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                            <th className="p-4">Physician</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Time Slot</th>
                            <th className="p-4">Chief Complaint</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850 text-zinc-300">
                          {filteredAppointments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-zinc-505 italic">
                                No appointments found matching search query.
                              </td>
                            </tr>
                          ) : (
                            filteredAppointments.map((apt) => (
                              <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                                <td className="p-4 font-semibold text-white">Dr. {apt.doctorName}</td>
                                <td className="p-4 font-mono">{apt.date}</td>
                                <td className="p-4 font-mono">{apt.time}</td>
                                <td className="p-4 text-zinc-450 truncate max-w-xs">{apt.reason || 'General checkup'}</td>
                                <td className="p-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusClass(apt.status)}`}>
                                    {apt.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end space-x-3">
                                    {['scheduled', 'waiting', 'pending', 'confirmed'].includes(apt.status) && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setReschedulingApt(apt);
                                            setReschedDate(apt.date || '');
                                            setReschedTime(apt.time || '');
                                          }}
                                          className="text-xs font-bold text-cyan-405 hover:text-cyan-300 transition-colors cursor-pointer"
                                        >
                                          Reschedule
                                        </button>
                                        <button
                                          onClick={() => handleCancelAppointment(apt.id)}
                                          className="text-xs font-bold text-rose-450 hover:text-rose-350 transition-colors cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MEDICAL RECORDS & REPORTS TAB */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  {/* Health Stats Overview */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-4">Patient Health Profile Records</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-550 font-bold uppercase block">Health Card Status</span>
                        <span className="text-lg font-extrabold text-emerald-400 font-sans">Active</span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-550 font-bold uppercase block">Consultations Completed</span>
                        <span className="text-lg font-extrabold text-white">
                          {appointments.filter(a => a.status === 'completed').length} visits
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-550 font-bold uppercase block">Clinic Diagnoses</span>
                        <span className="text-lg font-extrabold text-cyan-400">{records.length} files</span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-550 font-bold uppercase block">Allergies Status</span>
                        <span className={`text-lg font-extrabold ${user?.profile?.allergies && user.profile.allergies !== 'None' ? 'text-rose-455' : 'text-zinc-400'}`}>
                          {user?.profile?.allergies && user.profile.allergies !== 'None' ? 'Restricted' : 'Safe'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Records Timeline */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white font-sans">Electronic Health Records & Diagnoses</h3>
                    
                    {filteredRecords.length === 0 ? (
                      <p className="text-xs text-zinc-550 italic p-4 text-center">No clinical diagnoses records on file.</p>
                    ) : (
                      <div className="space-y-4">
                        {filteredRecords.map((rec) => (
                          <div key={rec.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-3.5">
                            <div className="flex justify-between items-center text-xs">
                              <div>
                                <strong className="text-white text-xs block">{rec.diagnosis}</strong>
                                <span className="text-zinc-500 block text-[9px] mt-0.5">Consulted by {rec.doctorName} on {rec.date}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handlePrint('prescription', rec)}
                                  className="py-1 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-cyan-400 font-bold rounded text-[9px] transition-colors cursor-pointer"
                                >
                                  🖨️ Print Rx
                                </button>
                                <span className="text-[9px] font-mono text-zinc-505 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                                  ID: {rec.id.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-zinc-350 leading-relaxed font-sans">{rec.notes}</p>
                            
                            {rec.prescription && rec.prescription.length > 0 && (
                              <div className="pt-2 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-zinc-400">
                                {rec.prescription.map((rx, idx) => (
                                  <div key={idx} className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-850/50">
                                    <strong className="text-zinc-305">💊 {rx.drug}</strong> &mdash; <span className="font-mono text-cyan-400">{rx.dosage}</span>
                                    <span className="block text-[9px] text-zinc-500 italic mt-0.5">{rx.instructions} ({rx.duration})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BILLING & INVOICES TAB */}
              {activeTab === 'billing' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Summary Cards */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-4">Billing & Financial Ledger</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">Outstanding Balance</span>
                        <span className="text-lg font-extrabold text-amber-400">
                          ${invoices.filter(i => i.status === 'unpaid').reduce((acc, i) => acc + i.amount, 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">Total Paid Ledger</span>
                        <span className="text-lg font-extrabold text-emerald-400">
                          ${invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">Total Invoiced</span>
                        <span className="text-lg font-extrabold text-white">
                          ${invoices.reduce((acc, i) => acc + i.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Table List */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white">Consultation Invoices</h3>
                      <span className="text-xs text-zinc-550">{invoices.length} transactions total</span>
                    </div>

                    <div className="overflow-x-auto">
                      {invoices.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic p-6 text-center">No invoice records found.</p>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-sans">
                              <th className="p-4">Invoice ID</th>
                              <th className="p-4">Date</th>
                              <th className="p-4">Description</th>
                              <th className="p-4">Amount</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850 text-xs text-zinc-350 font-sans">
                            {invoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-zinc-900/20">
                                <td className="p-4 font-mono text-[11px] text-zinc-400">{inv.id}</td>
                                <td className="p-4 font-mono">{inv.date}</td>
                                <td className="p-4">{inv.description}</td>
                                <td className="p-4 font-bold text-white">${inv.amount.toFixed(2)}</td>
                                <td className="p-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border capitalize ${
                                    inv.status === 'paid'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  {inv.status === 'unpaid' ? (
                                    <button
                                      onClick={() => openCheckout(inv)}
                                      className="py-1 px-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-lg text-[10px] transition-colors cursor-pointer shadow shadow-cyan-550/10"
                                    >
                                      Pay Invoice
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handlePrint('receipt', inv)}
                                      className="py-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer"
                                    >
                                      🖨️ Receipt
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* LAB REPORTS ACCESS TAB */}
              {activeTab === 'lab-reports' && (
                <div className="space-y-6">
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white">Laboratory Test Results & Findings</h3>
                      <span className="text-xs text-zinc-550">{labReports.length} test records</span>
                    </div>

                    <div className="p-6">
                      {labReports.length === 0 ? (
                        <p className="text-xs text-zinc-550 italic text-center py-8">No diagnostic laboratory reports on file.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {labReports.map((lab) => {
                            const statusColors = {
                              normal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                              high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                              low: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                              pending: 'bg-zinc-800 text-zinc-400 border-zinc-750'
                            };
                            return (
                              <div key={lab.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-3 font-sans">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <strong className="text-white text-xs block">{lab.testName}</strong>
                                    <span className="text-[10px] text-zinc-500 mt-0.5 block">Ordered by Dr. {lab.doctorName || 'Staff'} on {lab.date}</span>
                                  </div>
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border capitalize ${
                                    statusColors[lab.status?.toLowerCase()] || statusColors.pending
                                  }`}>
                                    {lab.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-zinc-900/40 p-3 rounded-xl border border-zinc-850/50 text-[10px]">
                                  <div>
                                    <span className="text-zinc-500 block">Measured Result</span>
                                    <strong className="text-white text-xs font-mono">{lab.result || 'Pending Result'}</strong>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 block">Reference Range</span>
                                    <span className="text-zinc-300 font-mono">{lab.referenceRange}</span>
                                  </div>
                                </div>

                                {lab.notes && (
                                  <div className="text-[10px] text-zinc-450 leading-relaxed border-t border-zinc-900 pt-2">
                                    <span className="text-zinc-500 font-bold block mb-0.5">Laboratory Notes:</span>
                                    {lab.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECURE DIRECT MESSAGING TAB */}
              {activeTab === 'messages' && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden h-[600px] flex">
                  {/* Left Doctors Panel */}
                  <div className="w-1/3 border-r border-zinc-800 flex flex-col h-full bg-zinc-950/20">
                    <div className="p-4 border-b border-zinc-800">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Physicians Directory</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-850 p-2 space-y-1">
                      {doctors.length === 0 ? (
                        <p className="text-[10px] text-zinc-550 italic p-4 text-center">No consulting physicians available.</p>
                      ) : (
                        doctors.map((doc) => {
                          const isSelected = selectedChatDoctor?.id === doc.id;
                          return (
                            <button
                              key={doc.id}
                              onClick={() => selectDoctorChat(doc)}
                              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border-cyan-505/30 text-cyan-400'
                                  : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-white'
                              }`}
                            >
                              <strong className="text-xs block font-bold">Dr. {doc.name}</strong>
                              <span className="text-[9px] uppercase tracking-wider font-mono opacity-80 block mt-0.5">
                                {doc.profile?.specialization || 'Consulting MD'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Chat Panel */}
                  <div className="flex-1 flex flex-col h-full bg-zinc-950/40">
                    {selectedChatDoctor ? (
                      <>
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-white">Dr. {selectedChatDoctor.name}</h4>
                            <span className="text-[9px] text-zinc-550 font-sans">Secure Pre-Consultation Messaging Thread</span>
                          </div>
                          <button
                            onClick={refreshMessages}
                            className="p-1.5 hover:bg-zinc-855 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-205 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            🔄 Sync Chat
                          </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin" id="chat-messages-container">
                          {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                              <span className="text-3xl">💬</span>
                              <p className="text-xs text-zinc-550">No messages exchanged yet.</p>
                              <p className="text-[10px] text-zinc-600 max-w-xs">Ask a question or explain your chief symptoms to start your consultation thread.</p>
                            </div>
                          ) : (
                            chatMessages.map((msg) => {
                              const isMine = msg.senderId === user.id;
                              return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[70%] p-3 rounded-2xl text-xs space-y-1 ${
                                    isMine
                                      ? 'bg-gradient-to-br from-cyan-600/90 to-indigo-650/90 text-white rounded-tr-none shadow shadow-cyan-500/5'
                                      : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-750'
                                  }`}>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <span className="text-[8px] opacity-60 block text-right font-mono">
                                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={sendMessage} className="p-4 border-t border-zinc-850 bg-zinc-950 flex items-center space-x-2">
                          <input
                            type="text"
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            placeholder={`Send message to Dr. ${selectedChatDoctor.name}...`}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-550"
                          />
                          <button
                            type="submit"
                            disabled={!newMessageText.trim() || sendingMsg}
                            className="py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-505 text-zinc-955 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            {sendingMsg ? '...' : 'Send'}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 font-sans">
                        <div className="h-16 w-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl text-zinc-500 shadow-inner">
                          💬
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Direct Secure Messaging</h4>
                          <p className="text-xs text-zinc-500 max-w-sm mt-1">Select a consulting physician from the directory to start a secure messaging thread.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI HEALTH ASSISTANT / SYMPTOM TRIAGE TAB */}
              {activeTab === 'ai-triage' && (
                <AiSymptomTriage
                  user={user}
                  doctors={doctors}
                  onSelectDoctorForBooking={(docId, prefilledReason) => {
                    if (docId) setBookDoctorId(docId);
                    if (prefilledReason) setBookReason(prefilledReason);
                    setActiveTab('appointments');
                  }}
                />
              )}

              {/* SETTINGS / PROFILE TAB */}
              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-white font-sans">Edit Patient Clinical Profile</h3>
                      <p className="text-xs text-zinc-450 mt-1">Configure your clinical card data (Allergies, emergency contact) to help doctors analyze your file.</p>
                    </div>

                    {profileError && (
                      <div className="bg-rose-955/40 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs">
                        {profileError}
                      </div>
                    )}

                    {profileSuccess && (
                      <div className="bg-emerald-955/40 border border-emerald-800 text-emerald-305 p-4 rounded-xl text-xs">
                        {profileSuccess}
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-4 font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label htmlFor="edit-phone" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contact Phone Number</label>
                          <input
                            id="edit-phone"
                            type="text"
                            placeholder="+1 (555) 019-2834"
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="edit-dob" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Date of Birth</label>
                          <input
                            id="edit-dob"
                            type="date"
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none text-zinc-400"
                            value={editDob}
                            onChange={(e) => setEditDob(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label htmlFor="edit-gender" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gender</label>
                          <select
                            id="edit-gender"
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value)}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-Binary">Non-Binary</option>
                            <option value="Not Specified">Not Specified</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="edit-blood" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Blood Group</label>
                          <select
                            id="edit-blood"
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                            value={editBloodGroup}
                            onChange={(e) => setEditBloodGroup(e.target.value)}
                          >
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="Not Specified">Not Specified</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="edit-emergency" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Emergency Contact (Name & Phone)</label>
                        <input
                          id="edit-emergency"
                          type="text"
                          placeholder="e.g. Jane Doe (+1 555-019-2233)"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={editEmergency}
                          onChange={(e) => setEditEmergency(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="edit-allergies" className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">Medical Allergies</label>
                        <input
                          id="edit-allergies"
                          type="text"
                          placeholder="e.g. Penicillin, Peanuts (If none, write 'None')"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={editAllergies}
                          onChange={(e) => setEditAllergies(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-505 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                      >
                        {profileLoading ? 'Updating Clinical Profile...' : 'Save Profile Changes'}
                      </button>
                    </form>
                  </div>

                  {/* Warning Box */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4 font-sans">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">⚠️ Clinical Safety Note</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Please verify that your allergies list and emergency contacts are correct. Doctors query this information dynamically during diagnosis session.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Reschedule Modal Overlay */}
          {reschedulingApt && (
            <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative font-sans">
                <button
                  onClick={() => setReschedulingApt(null)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer text-lg font-bold"
                >
                  ✕
                </button>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Reschedule Doctor Appointment</h3>
                  <p className="text-xs text-zinc-450">Select a new date and available time slot for your consultation with Dr. {reschedulingApt.doctorName}.</p>
                </div>

                {reschedError && (
                  <div className="bg-rose-955/40 border border-rose-800 text-rose-200 p-3 rounded-lg text-xs">
                    {reschedError}
                  </div>
                )}

                {reschedSuccess && (
                  <div className="bg-emerald-950/40 border border-emerald-850 text-emerald-300 p-3 rounded-lg text-xs">
                    {reschedSuccess}
                  </div>
                )}

                <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-sans">
                      Choose New Date *
                    </label>
                    <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                      {getAvailableDates().map((d) => {
                        const isSelected = reschedDate === d.key;
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => {
                              setReschedDate(d.key);
                              setReschedTime('');
                            }}
                            className={`flex-none w-14 p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/10'
                                : 'bg-zinc-950 border-zinc-850 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span className="text-[8px] uppercase font-bold tracking-wider">{d.dayName}</span>
                            <span className="text-sm font-extrabold">{d.dayNum}</span>
                            <span className="text-[7px] uppercase tracking-widest">{d.monthName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {reschedDate && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-sans">Available Slots *</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                        {TIME_SLOTS.map((slot) => {
                          const taken = isSlotBooked(reschedDate, slot, reschedulingApt.doctorId);
                          const selected = reschedTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={taken}
                              onClick={() => setReschedTime(slot)}
                              className={`py-2 px-1 text-center rounded-lg text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                                selected 
                                  ? 'bg-cyan-500 text-zinc-950 border-cyan-405 shadow-sm'
                                  : taken
                                  ? 'bg-zinc-900/40 text-zinc-600 border-zinc-900/60 line-through cursor-not-allowed opacity-30'
                                  : 'bg-zinc-950 text-zinc-300 border-zinc-850 hover:border-zinc-700 hover:text-white'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      {reschedTime && (
                        <div className="text-[10px] text-cyan-400 font-semibold mt-1">
                          ✓ Rescheduled Slot: {reschedDate} @ {reschedTime}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setReschedulingApt(null)}
                      className="py-2 px-4 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reschedLoading}
                      className="py-2 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-955 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {reschedLoading ? 'Saving...' : 'Confirm Reschedule'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Billing Checkout Modal */}
          {checkoutOpen && selectedInvoice && (
            <div className="fixed inset-0 bg-zinc-955/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative font-sans animate-fadeIn">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                  <div>
                    <h3 className="text-sm font-bold text-white">Payment Checkout Portal</h3>
                    <span className="text-[10px] text-zinc-500">Invoice Reference: {selectedInvoice.id}</span>
                  </div>
                  <button
                    onClick={() => {
                      setCheckoutOpen(false);
                      setPaymentSuccess(false);
                      setPaymentError('');
                    }}
                    className="text-zinc-505 hover:text-white text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {paymentSuccess ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl mx-auto font-bold">
                        ✓
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Payment Approved</h4>
                        <p className="text-[10px] text-zinc-455">Your transaction has been processed successfully.</p>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl text-left text-[10px] space-y-1.5 font-mono">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Invoice Amount:</span>
                          <span className="text-white font-bold">${selectedInvoice.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Transaction ID:</span>
                          <span className="text-cyan-405 font-bold">txn-{selectedInvoice.id.replace('inv-', '')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Gateway Status:</span>
                          <span className="text-emerald-405 font-bold">COMPLETED</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCheckoutOpen(false);
                          setPaymentSuccess(false);
                        }}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Return to Ledger
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Fee description */}
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl flex justify-between items-center">
                        <div className="max-w-[70%]">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase block">Consultation Fee</span>
                          <span className="text-xs text-zinc-300 block truncate">{selectedInvoice.description}</span>
                        </div>
                        <span className="text-lg font-extrabold text-white">${selectedInvoice.amount.toFixed(2)}</span>
                      </div>

                      {/* Method Tabs */}
                      <div className="grid grid-cols-2 gap-2 border-b border-zinc-800 pb-3">
                        <button
                          type="button"
                          onClick={() => setPaymentTab('card')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            paymentTab === 'card'
                              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
                              : 'text-zinc-505 hover:text-zinc-300'
                          }`}
                        >
                          💳 Credit Card
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentTab('upi')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            paymentTab === 'upi'
                              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700'
                              : 'text-zinc-505 hover:text-zinc-300'
                          }`}
                        >
                          📱 UPI Scan & Pay
                        </button>
                      </div>

                      {paymentError && (
                        <div className="p-3 bg-rose-500/10 text-rose-455 border border-rose-500/20 rounded-xl text-[10px] font-semibold text-center">
                          {paymentError}
                        </div>
                      )}

                      {paymentTab === 'card' ? (
                        <form onSubmit={handlePaymentSubmit} className="space-y-3 text-left">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-450 block">Cardholder Name</label>
                            <input
                              type="text"
                              required
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="e.g. John Doe"
                              className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-455 block">16-Digit Card Number</label>
                            <input
                              type="text"
                              required
                              maxLength="19"
                              value={cardNumber}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                                const parts = [];
                                for (let i = 0; i < val.length; i += 4) {
                                  parts.push(val.substring(i, i + 4));
                                }
                                setCardNumber(parts.join(' '));
                              }}
                              placeholder="4000 1234 5678 9010"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-450 block text-center">Expiry Date</label>
                              <input
                                type="text"
                                required
                                maxLength="5"
                                placeholder="MM/YY"
                                value={cardExpiry}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/[^0-9]/g, '');
                                  if (val.length > 2) {
                                    val = val.substring(0, 2) + '/' + val.substring(2, 4);
                                  }
                                  setCardExpiry(val);
                                }}
                                className="w-full bg-zinc-950 border border-zinc-855 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-455 block text-center">CVV Code</label>
                              <input
                                type="password"
                                required
                                maxLength="3"
                                placeholder="•••"
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none text-center"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={payingInvoice}
                            className="w-full mt-4 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/10 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {payingInvoice ? 'Authorizing Payment...' : `Pay $${selectedInvoice.amount.toFixed(2)} Securely`}
                          </button>
                        </form>
                      ) : (
                        <div className="text-center py-4 space-y-4">
                          <div className="bg-white p-3 rounded-xl inline-block shadow-md">
                            <div className="h-32 w-32 bg-zinc-100 border-4 border-white flex flex-col items-center justify-center text-[10px] text-zinc-900 font-bold select-none relative">
                              <div className="absolute top-1 left-1 h-6 w-6 border-4 border-black"></div>
                              <div className="absolute top-1 right-1 h-6 w-6 border-4 border-black"></div>
                              <div className="absolute bottom-1 left-1 h-6 w-6 border-4 border-black"></div>
                              <div className="h-10 w-10 border border-dashed border-zinc-850 flex items-center justify-center font-mono text-[7px] p-0.5 text-center">
                                CAREPULSE GATEWAY
                              </div>
                              <span className="text-[6px] text-zinc-500 mt-12 block">Scan to Pay</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-400">Scan this QR code using any UPI app (GPay, PhonePe, Paytm)</p>
                            <p className="text-[9px] font-mono text-zinc-500">Ref: carepulse@upi | Amount: ${selectedInvoice.amount.toFixed(2)}</p>
                          </div>
                          <button
                            onClick={simulateUPISuccess}
                            disabled={payingInvoice}
                            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                          >
                            {payingInvoice ? 'Waiting for Network confirmation...' : 'Simulate UPI Payment Success'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DashboardLayout>
      </div>

      {/* PRINT LAYOUT SANDBOX */}
      {printItem && (
        <div className="hidden print:block bg-white text-zinc-950 p-8 min-h-screen font-sans border border-zinc-205">
          {printItem.type === 'prescription' ? (
            <div className="space-y-6">
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-zinc-850 pb-4">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900">CarePulse Medical Center</h1>
                  <p className="text-[10px] text-zinc-550">123 Healthcare Blvd, Suite 500, Medical District</p>
                  <p className="text-[10px] text-zinc-550">Phone: (555) 019-2834 | Fax: (555) 019-2835</p>
                </div>
                <div className="text-right text-[10px] text-zinc-550">
                  <p className="font-bold text-zinc-900 font-sans">Rx MEDICAL RECORD</p>
                  <p>Date: {printItem.data.date}</p>
                  <p>Record ID: {printItem.data.id}</p>
                </div>
              </div>

              {/* Patient and Clinician Info */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-100 p-4 rounded-xl text-xs font-sans">
                <div>
                  <h3 className="font-bold text-[10px] uppercase text-zinc-450 mb-1">Patient Details</h3>
                  <p className="font-bold text-zinc-900 text-sm">{user?.name}</p>
                  <p className="text-zinc-650">DOB: {user?.profile?.dob || 'Not specified'}</p>
                  <p className="text-zinc-655 font-semibold">Blood Group: {user?.profile?.bloodGroup || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="font-bold text-[10px] uppercase text-zinc-450 mb-1">Consultant Details</h3>
                  <p className="font-bold text-zinc-900 text-sm">{printItem.data.doctorName}</p>
                  <p className="text-zinc-650">CarePulse Clinic Staff Physician</p>
                </div>
              </div>

              {/* Diagnosis Summary */}
              <div className="space-y-2">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-900 border-b border-zinc-300 pb-1">
                  Clinical Diagnosis & Chief Complaint
                </h3>
                <p className="text-xs font-bold text-zinc-900">{printItem.data.diagnosis}</p>
                <p className="text-xs text-zinc-700 leading-relaxed font-sans">{printItem.data.notes}</p>
              </div>

              {/* Prescription Items */}
              {printItem.data.prescription && printItem.data.prescription.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-900 border-b border-zinc-300 pb-1">
                    Prescribed Pharmacotherapy
                  </h3>
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="border-b border-zinc-400 text-[10px] uppercase text-zinc-550 font-bold">
                        <th className="py-2">Medication / Drug Name</th>
                        <th className="py-2">Dosage</th>
                        <th className="py-2">Duration</th>
                        <th className="py-2">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-zinc-800">
                      {printItem.data.prescription.map((rx, idx) => (
                        <tr key={idx} className="py-2">
                          <td className="py-2 font-bold text-zinc-950">💊 {rx.drug}</td>
                          <td className="py-2 font-mono">{rx.dosage}</td>
                          <td className="py-2">{rx.duration}</td>
                          <td className="py-2 text-zinc-605 italic">{rx.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sign-off Seal */}
              <div className="pt-12 flex justify-between items-end">
                <div className="text-[10px] text-zinc-500 max-w-xs font-sans">
                  <p>This medical document is electronically validated and authenticated.</p>
                  <p className="mt-1 font-mono">CarePulse Security Protocol: SHA-256 Verified</p>
                </div>
                <div className="text-center w-48 border-t border-zinc-400 pt-2 text-[10px]">
                  <p className="font-bold text-zinc-800">Dr. {printItem.data.doctorName}</p>
                  <p className="text-zinc-500">Authorized Physician Signature</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-zinc-850 pb-4">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-zinc-900">CarePulse Medical Center</h1>
                  <p className="text-[10px] text-zinc-550">123 Healthcare Blvd, Suite 500, Medical District</p>
                  <p className="text-[10px] text-zinc-555 font-semibold">Billing & Accounting Office | (555) 019-2834</p>
                </div>
                <div className="text-right text-[10px] text-zinc-550">
                  <p className="font-bold text-zinc-900 font-sans">TRANSACTION RECEIPT</p>
                  <p>Date: {printItem.data.date}</p>
                  <p>Invoice ID: {printItem.data.id}</p>
                </div>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-100 p-4 rounded-xl text-xs font-sans">
                <div>
                  <h3 className="font-bold text-[10px] uppercase text-zinc-450 mb-1">Billed To</h3>
                  <p className="font-bold text-zinc-900 text-sm">{user?.name}</p>
                  <p className="text-zinc-650">DOB: {user?.profile?.dob || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="font-bold text-[10px] uppercase text-zinc-450 mb-1">Receipt Status</h3>
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded font-extrabold text-[10px] uppercase tracking-wider border border-emerald-300">
                    PAID IN FULL
                  </span>
                  <p className="text-zinc-500 text-[9px] mt-1">Payment Method: Online Gateway (Simulated Checkout)</p>
                </div>
              </div>

              {/* Invoice Breakdown */}
              <div className="space-y-3">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-zinc-900 border-b border-zinc-300 pb-1">
                  Itemized Charges Ledger
                </h3>
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead>
                    <tr className="border-b border-zinc-400 text-[10px] uppercase text-zinc-550 font-bold">
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-zinc-800">
                    <tr>
                      <td className="py-3 text-zinc-900 font-semibold">{printItem.data.description}</td>
                      <td className="py-3 text-right font-bold font-mono text-zinc-950">${printItem.data.amount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="border-t border-zinc-300 pt-4 flex justify-end">
                <div className="w-48 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-zinc-650">
                    <span>Subtotal:</span>
                    <span>${printItem.data.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-655">
                    <span>Tax (0%):</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-300 pt-1.5 font-bold text-zinc-950">
                    <span>Total Paid:</span>
                    <span>${printItem.data.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Sign-off Seal */}
              <div className="pt-16 flex justify-between items-end">
                <div className="text-[10px] text-zinc-500 font-sans">
                  <p>Thank you for choosing CarePulse Medical Center.</p>
                  <p>For billing queries, email billing@carepulse.com</p>
                </div>
                <div className="text-center w-48 border-t border-zinc-400 pt-2 text-[10px]">
                  <p className="font-bold text-zinc-700">Accounting Office Seal</p>
                  <p className="text-zinc-500">Authorized Electronic Receipt</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function PatientDashboard() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        <p className="text-zinc-500 text-sm">Collating patient workspace records...</p>
      </div>
    }>
      <PatientDashboardContent />
    </Suspense>
  );
}
