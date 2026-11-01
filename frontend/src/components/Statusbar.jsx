import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { nowTime } from '../services/api';

export default function Statusbar() {
  const { activeClinic } = useAuth();
  const [clock, setClock] = useState(nowTime());

  useEffect(() => {
    const timer = setInterval(() => { setClock(nowTime()); }, 1000);
    return () => clearInterval(timer);
  }, []);

  const name = activeClinic?.name || 'Umesh Pal Clinic';

  return (
    <footer className="cms-statusbar">
      <span id="statusbar-clinic-title">
        <b>{name} System</b>
      </span>
      <span>F1 Family Reg</span>
      <span>F2 Add Member</span>
      <span>F3 Record</span>
      <span>F4 Dashboard</span>
      <span>F5 Reports</span>
      <span>F6 Certificate</span>
      <span>F7 Master Data</span>
      <span id="statusbar-clock" className="font-mono" style={{ marginLeft: 'auto' }}>
        {clock}
      </span>
    </footer>
  );
}
