import React from 'react';
import Link from 'next/link';

async function getTherapistProfile(slug) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const res = await fetch(`${API_URL}/api/profiles/public/therapist/${slug}/`, {
    cache: 'no-store'
  });
  
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch profile');
  }
  
  return res.json();
}

async function getAvailableSlots(therapistId) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  // Note: For public web bookings, we would normally have a public unauthenticated slots endpoint.
  // The current AvailableSlotsView requires IsAuthenticated. 
  // Let's assume we will create a public one or modify the existing one. For now we will fetch.
  // Actually, wait! The current AvailableSlotsView requires authentication in Django!
  // I will need to make a public endpoint for fetching slots or make the existing one AllowAny.
  
  const res = await fetch(`${API_URL}/api/profiles/public/therapist/${therapistId}/slots/`, {
    cache: 'no-store'
  });
  
  if (!res.ok) return { available_slots: [] };
  return res.json();
}

export default async function BookingPage({ params }) {
  const slug = params.slug;
  const profile = await getTherapistProfile(slug);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <h1 className="text-2xl font-bold text-slate-800">Therapist Not Found</h1>
      </div>
    );
  }

  // We need a client component for interactive booking calendar. 
  // For the server component, we just render the shell and pass the profile.
  
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link href={`/therapist/${slug}`} className="text-teal-600 font-medium hover:text-teal-700 flex items-center">
            <span className="mr-2">←</span> Back to Profile
          </Link>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-8 text-center">
           <h1 className="text-3xl font-bold text-slate-900 mb-4">Book with {profile.name}</h1>
           <p className="text-slate-500 mb-8">This is the public web booking gateway.</p>
           
           <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
             <h2 className="font-bold text-lg mb-2">🚧 Under Construction</h2>
             <p>The interactive web booking calendar is being wired up to the backend. Please download the Seeker mobile app to book a session.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
