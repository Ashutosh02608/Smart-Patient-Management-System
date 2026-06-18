'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
];

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper: Format Date object to YYYY-MM-DD
const formatDateString = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper: Get stable colors for doctors
const getDoctorColors = (docId, index) => {
  const colors = [
    { bg: 'bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
    { bg: 'bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
    { bg: 'bg-purple-500/10 hover:bg-purple-500/15 text-purple-400 border-purple-500/25' },
    { bg: 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    { bg: 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-400 border-amber-500/25' },
    { bg: 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border-rose-500/25' }
  ];
  let hash = 0;
  if (docId) {
    for (let i = 0; i < docId.length; i++) {
      hash = docId.charCodeAt(i) + ((hash << 5) - hash);
    }
  } else {
    hash = index || 0;
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export default function ClinicalCalendar() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect patients away
  useEffect(() => {
    if (user && user.role === 'patient') {
      router.push('/patient');
    }
  }, [user, router]);

  // Calendar States
  const [viewMode, setViewMode] = useState('week'); // day | week | month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');

  // Registry Data
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [syncingTask, setSyncingTask] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Fetch Schedules & Doctor Directories
  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [aptRes, docRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/users?role=doctor')
      ]);

      if (aptRes.ok && docRes.ok) {
        const apts = await aptRes.json();
        const docs = await docRes.json();

        setAppointments(apts);
        setDoctors(docs);

        // If the logged in user is a doctor, default filter to their own schedule
        if (user && user.role === 'doctor') {
          setSelectedDoctorId(user.id);
        }
      }
    } catch (err) {
      console.error("Calendar data fetch failure:", err);
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

  // Navigate Date
  const handlePrevDate = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const handleNextDate = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Get days of the active week (Sunday through Saturday)
  const getWeekDays = (baseDate) => {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust to Sunday
    const sunday = new Date(d.setDate(diff));
    const week = [];
    for (let i = 0; i < 7; i++) {
      const wDay = new Date(sunday);
      wDay.setDate(sunday.getDate() + i);
      week.push(wDay);
    }
    return week;
  };

  // Get grid days of the active month (including previous/next padding cells)
  const getMonthGridDays = (baseDate) => {
    const d = new Date(baseDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // index 0-6

    // Starting padding: Sunday before the first day of month
    const startPadding = new Date(firstDay);
    startPadding.setDate(firstDay.getDate() - firstDayOfWeek);

    const grid = [];
    const temp = new Date(startPadding);
    
    // Fill 42 cells (6 weeks grid layout)
    for (let i = 0; i < 42; i++) {
      grid.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    return grid;
  };

  // Checking Conflict Excluding the current appointment being modified
  const isConflictExcluding = (date, time, doctorId, excludeAptId) => {
    return appointments.some(a => 
      a.date === date && 
      a.time === time && 
      a.doctorId === doctorId && 
      a.status !== 'cancelled' && 
      a.id !== excludeAptId
    );
  };

  // HTML5 Drag and Drop events
  const handleDragStart = (e, appointmentId) => {
    e.dataTransfer.setData("text/plain", appointmentId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetDate, targetTime, targetDoctorId) => {
    e.preventDefault();
    setErrorNotice('');
    setSuccessNotice('');
    
    const appointmentId = e.dataTransfer.getData("text/plain");
    if (!appointmentId) return;

    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return;

    // Resolve doctor parameters: keep existing doctor if not specified in target
    const finalDocId = targetDoctorId || apt.doctorId;
    const finalDocName = targetDoctorId 
      ? (doctors.find(d => d.id === targetDoctorId)?.name || apt.doctorName)
      : apt.doctorName;

    // Check validation constraints
    const isConflict = isConflictExcluding(targetDate, targetTime, finalDocId, appointmentId);
    if (isConflict) {
      setErrorNotice(`Conflict Alert: Dr. ${finalDocName} is already booked at ${targetTime} on ${targetDate}.`);
      return;
    }

    setSyncingTask(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: appointmentId,
          date: targetDate,
          time: targetTime,
          doctorId: finalDocId,
          doctorName: finalDocName
        })
      });

      if (res.ok) {
        setSuccessNotice(`Rescheduled: ${apt.patientName}'s consultation slot updated successfully.`);
        // Refresh local memory registry
        const updatedApts = appointments.map(a => {
          if (a.id === appointmentId) {
            return { ...a, date: targetDate, time: targetTime, doctorId: finalDocId, doctorName: finalDocName };
          }
          return a;
        });
        setAppointments(updatedApts);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update appointment slot.');
      }
    } catch (err) {
      setErrorNotice(err.message || 'An error occurred during drag-rescheduling.');
    } finally {
      setSyncingTask(false);
      setTimeout(() => {
        setErrorNotice('');
        setSuccessNotice('');
      }, 4000);
    }
  };

  // Get active display range label
  const getHeaderDateLabel = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (viewMode === 'week') {
      const week = getWeekDays(currentDate);
      const start = week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = week[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} – ${end}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (user && user.role === 'patient') {
    return null;
  }

  // Active physicians to plot in the Day View columns
  const activePhysicians = selectedDoctorId === 'all' 
    ? doctors 
    : doctors.filter(d => d.id === selectedDoctorId);

  return (
    <DashboardLayout
      roleTitle={user?.role === 'admin' ? 'Administrator' : user?.role === 'doctor' ? 'Doctor Portal' : 'Receptionist'}
      activeTab="calendar"
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>🗓️</span> <span>Clinical Schedule Planner</span>
              {syncingTask && (
                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  Saving modifications...
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-450">Drag and drop consultations to reschedule. Live conflicts checked dynamically.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* View selectors */}
            <div className="inline-flex rounded-xl bg-zinc-950 p-1 border border-zinc-850">
              {['day', 'week', 'month'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    viewMode === mode
                      ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/10'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Doctor filter dropdown (disabled if logged-in role is a doctor) */}
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={user?.role === 'doctor'}
              className="bg-zinc-950 border border-zinc-855 text-xs text-zinc-350 px-3 py-2 rounded-xl focus:outline-none cursor-pointer hover:border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Doctors (Merged View)</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  Dr. {d.name} ({d.profile?.specialization || 'General'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Floating validation toasts */}
        {errorNotice && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs flex items-center space-x-2">
            <span>⚠️</span> <span>{errorNotice}</span>
          </div>
        )}
        {successNotice && (
          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-305 p-4 rounded-xl text-xs flex items-center space-x-2">
            <span>✓</span> <span>{successNotice}</span>
          </div>
        )}

        {/* Date Navigation Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevDate}
              className="p-2 border border-zinc-855 bg-zinc-950 rounded-xl hover:border-zinc-700 transition-colors text-xs text-zinc-400 hover:text-white cursor-pointer"
            >
              ◀
            </button>
            <button
              onClick={handleToday}
              className="px-3.5 py-2 border border-zinc-855 bg-zinc-950 rounded-xl hover:border-zinc-700 transition-colors text-xs text-zinc-400 hover:text-white cursor-pointer font-semibold"
            >
              Today
            </button>
            <button
              onClick={handleNextDate}
              className="p-2 border border-zinc-855 bg-zinc-950 rounded-xl hover:border-zinc-700 transition-colors text-xs text-zinc-400 hover:text-white cursor-pointer"
            >
              ▶
            </button>
          </div>

          <h3 className="text-sm font-bold text-white tracking-wide">{getHeaderDateLabel()}</h3>
        </div>

        {/* Main Grid Workspace */}
        {loadingData ? (
          <div className="flex flex-col items-center justify-center p-24 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="text-zinc-550 text-xs font-mono">Syncing calendar records...</p>
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            
            {/* 1. DAY VIEW */}
            {viewMode === 'day' && (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Grid Columns Header */}
                  <div className="grid border-b border-zinc-850 bg-zinc-900/30 font-bold uppercase tracking-wider text-[10px] text-zinc-400 text-center"
                       style={{ gridTemplateColumns: `100px repeat(${activePhysicians.length}, 1fr)` }}>
                    <div className="p-4 border-r border-zinc-850 text-left">Time</div>
                    {activePhysicians.map((doc, idx) => (
                      <div key={doc.id} className={`p-4 ${idx < activePhysicians.length - 1 ? 'border-r border-zinc-850' : ''}`}>
                        Dr. {doc.name}
                        <span className="block text-[8px] text-zinc-500 font-normal mt-0.5 capitalize">{doc.profile?.room || 'Cabinet 101'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Hourly Rows */}
                  <div className="divide-y divide-zinc-850/60">
                    {TIME_SLOTS.map((slot) => {
                      const dateStr = formatDateString(currentDate);
                      return (
                        <div key={slot} className="grid text-xs text-zinc-455 items-stretch"
                             style={{ gridTemplateColumns: `100px repeat(${activePhysicians.length}, 1fr)` }}>
                          {/* Time label column */}
                          <div className="p-3 border-r border-zinc-850 font-mono text-[10.5px] bg-zinc-900/10 flex items-center text-zinc-500">{slot}</div>
                          
                          {/* Doctor columns */}
                          {activePhysicians.map((doc, idx) => {
                            const cellApts = appointments.filter(a => a.date === dateStr && a.time === slot && a.doctorId === doc.id && a.status !== 'cancelled');
                            const colColors = getDoctorColors(doc.id, idx);
                            
                            return (
                              <div
                                key={doc.id}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, dateStr, slot, doc.id)}
                                className={`p-1.5 transition-colors relative min-h-[48px] hover:bg-zinc-950/25 ${
                                  idx < activePhysicians.length - 1 ? 'border-r border-zinc-850' : ''
                                }`}
                              >
                                {cellApts.map((apt) => (
                                  <div
                                    key={apt.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, apt.id)}
                                    className={`p-2 rounded-xl border flex flex-col font-sans transition-all active:scale-[0.98] select-none cursor-move shadow-md ${colColors.bg} ${colColors.border}`}
                                    title="Drag me to another slot!"
                                  >
                                    <div className="flex justify-between items-center">
                                      <strong className="text-[11px] truncate w-[85%]">{apt.patientName}</strong>
                                      <span className="text-[8px] opacity-75 font-mono select-none">⋮⋮</span>
                                    </div>
                                    <span className="text-[9px] truncate max-w-xs mt-0.5 opacity-90">{apt.reason || 'General Consult'}</span>
                                    <span className="text-[8px] uppercase tracking-wider font-bold mt-1 inline-block bg-zinc-950/20 px-1 py-0.5 rounded border border-white/5 w-fit">
                                      {apt.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. WEEK VIEW */}
            {viewMode === 'week' && (
              <div className="overflow-x-auto">
                <div className="min-w-[950px]">
                  {/* Columns Header (Time + 7 Weekdays) */}
                  <div className="grid grid-cols-8 border-b border-zinc-850 bg-zinc-900/30 font-bold uppercase tracking-wider text-[10px] text-zinc-400 text-center">
                    <div className="p-4 border-r border-zinc-850 text-left">Time</div>
                    {getWeekDays(currentDate).map((day, idx) => {
                      const isToday = formatDateString(day) === formatDateString(new Date());
                      return (
                        <div key={idx} className={`p-4 ${isToday ? 'bg-cyan-500/5 text-cyan-400' : ''} ${idx < 6 ? 'border-r border-zinc-850' : ''}`}>
                          {WEEK_DAYS[day.getDay()]}
                          <span className="block text-[9px] text-zinc-500 font-normal mt-0.5">{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Hourly Rows */}
                  <div className="divide-y divide-zinc-850/60">
                    {TIME_SLOTS.map((slot) => (
                      <div key={slot} className="grid grid-cols-8 text-xs text-zinc-455 items-stretch">
                        {/* Time label column */}
                        <div className="p-3 border-r border-zinc-850 font-mono text-[10.5px] bg-zinc-900/10 flex items-center text-zinc-500">{slot}</div>
                        
                        {/* Day cells */}
                        {getWeekDays(currentDate).map((day, idx) => {
                          const dateStr = formatDateString(day);
                          // Filter appointments matching this date, slot and doctor filter selection
                          const cellApts = appointments.filter(a => 
                            a.date === dateStr && 
                            a.time === slot && 
                            (selectedDoctorId === 'all' || a.doctorId === selectedDoctorId) &&
                            a.status !== 'cancelled'
                          );

                          return (
                            <div
                              key={idx}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, dateStr, slot, null)}
                              className={`p-1.5 transition-colors relative min-h-[50px] hover:bg-zinc-950/25 ${
                                idx < 6 ? 'border-r border-zinc-850' : ''
                              }`}
                            >
                              {cellApts.map((apt) => {
                                const aptColors = getDoctorColors(apt.doctorId, 0);
                                return (
                                  <div
                                    key={apt.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, apt.id)}
                                    className={`p-2 rounded-xl border flex flex-col font-sans transition-all active:scale-[0.98] select-none cursor-move shadow-md ${aptColors.bg} ${aptColors.border}`}
                                    title="Drag me to another day or slot!"
                                  >
                                    <div className="flex justify-between items-center">
                                      <strong className="text-[11px] truncate w-[85%]">{apt.patientName}</strong>
                                      <span className="text-[8px] opacity-75 font-mono select-none">⋮⋮</span>
                                    </div>
                                    <span className="text-[9px] truncate max-w-xs mt-0.5 opacity-90">Dr. {apt.doctorName}</span>
                                    <span className="text-[8px] uppercase tracking-wider font-bold mt-1 inline-block bg-zinc-950/20 px-1 py-0.5 rounded border border-white/5 w-fit">
                                      {apt.status}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. MONTH VIEW */}
            {viewMode === 'month' && (
              <div>
                {/* Columns Header (7 Weekdays) */}
                <div className="grid grid-cols-7 border-b border-zinc-850 bg-zinc-900/30 font-bold uppercase tracking-wider text-[10px] text-zinc-400 text-center">
                  {WEEK_DAYS.map((day, idx) => (
                    <div key={idx} className={`p-4.5 ${idx < 6 ? 'border-r border-zinc-850' : ''}`}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 auto-rows-[120px] divide-x divide-y divide-zinc-850">
                  {getMonthGridDays(currentDate).map((day, idx) => {
                    const dateStr = formatDateString(day);
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = dateStr === formatDateString(new Date());

                    // Filter appointments mapping this date and doctor filter
                    const cellApts = appointments.filter(a => 
                      a.date === dateStr && 
                      (selectedDoctorId === 'all' || a.doctorId === selectedDoctorId) &&
                      a.status !== 'cancelled'
                    );

                    return (
                      <div
                        key={idx}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, dateStr, "09:00 AM", null)} // Defaults drop to 09:00 AM on month rescheduling
                        className={`p-2 hover:bg-zinc-950/20 transition-all flex flex-col justify-start relative select-none ${
                          isCurrentMonth ? '' : 'opacity-25'
                        }`}
                      >
                        {/* Day indicator number */}
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[10px] font-mono font-bold flex items-center justify-center h-5 w-5 rounded-full ${
                            isToday ? 'bg-cyan-500 text-zinc-950' : isCurrentMonth ? 'text-zinc-300' : 'text-zinc-550'
                          }`}>
                            {day.getDate()}
                          </span>
                          {cellApts.length > 0 && (
                            <span className="text-[8.5px] font-bold text-zinc-555 font-mono">
                              {cellApts.length} apt(s)
                            </span>
                          )}
                        </div>

                        {/* List of short appointment badges inside day cell */}
                        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                          {cellApts.slice(0, 3).map((apt) => {
                            const aptColors = getDoctorColors(apt.doctorId, 0);
                            return (
                              <div
                                key={apt.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, apt.id)}
                                className={`px-2 py-1 rounded border text-[9px] font-sans truncate cursor-move select-none flex items-center justify-between ${aptColors.bg} ${aptColors.border}`}
                                title={`[${apt.time}] ${apt.patientName} with Dr. ${apt.doctorName}`}
                              >
                                <span className="truncate">{apt.patientName} ({apt.time})</span>
                                <span className="text-[7.5px] opacity-75 font-mono">⋮⋮</span>
                              </div>
                            );
                          })}
                          {cellApts.length > 3 && (
                            <div className="text-[8.5px] text-zinc-555 font-bold text-center">
                              + {cellApts.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
