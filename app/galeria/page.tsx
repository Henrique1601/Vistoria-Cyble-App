'use client';

import { useState, useEffect } from 'react';
import GaleriaClient from './GaleriaClient';

export default function GaleriaPage() {
  const [userRole, setUserRole] = useState<string>('viewer');
  
  useEffect(() => {
    const role = localStorage.getItem('vistoria_role') || 'viewer';
    setUserRole(role);
  }, []);
  
  return <GaleriaClient userRole={userRole} />;
}
