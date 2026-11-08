'use client';
import { useEffect } from 'react';
export default function FontLoader(){
  useEffect(()=>{
    // Optional typography must never block the first paint or camera controls.
    if(document.getElementById('lovebooth-fonts'))return;
    const link=document.createElement('link');link.id='lovebooth-fonts';link.rel='stylesheet';
    link.href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Gabarito:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap';
    document.head.appendChild(link);
  },[]);
  return null;
}
