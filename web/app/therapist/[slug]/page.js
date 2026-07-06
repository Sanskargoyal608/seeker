import React from 'react';
import Link from 'next/link';

async function getTherapistProfile(slug) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const res = await fetch(`${API_URL}/api/profiles/public/therapist/${slug}/`, {
    next: { revalidate: 60 } // Revalidate every minute
  });
  
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch profile');
  }
  
  return res.json();
}

export async function generateMetadata({ params }) {
  const slug = params.slug;
  const profile = await getTherapistProfile(slug);
  
  if (!profile) {
    return { title: 'Therapist Not Found | Seeker' };
  }
  
  return {
    title: `${profile.name} - Licensed Therapist | Seeker`,
    description: profile.bio ? profile.bio.substring(0, 150) + '...' : `Book a session with ${profile.name} on Seeker.`,
  };
}

export default async function TherapistProfilePage({ params }) {
  const slug = params.slug;
  const profile = await getTherapistProfile(slug);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Therapist Not Found</h1>
        <p className="text-slate-600 mb-8">The profile you are looking for does not exist or has been removed.</p>
        <Link href="/" className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="h-48 bg-gradient-to-r from-teal-500 to-blue-600"></div>
          
          <div className="relative px-8 pb-8">
            <div className="absolute -top-16 w-32 h-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-md flex items-center justify-center bg-teal-100">
              {profile.profile_photo ? (
                <img src={profile.profile_photo} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl text-teal-700 font-bold">{profile.name[0]}</span>
              )}
            </div>
            
            <div className="mt-20">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                <div>
                  <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{profile.name}</h1>
                  <p className="text-lg text-teal-600 font-medium mt-1">Licensed Therapist</p>
                </div>
                <div className="mt-6 md:mt-0 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Session Rate</p>
                  <p className="text-3xl font-bold text-slate-800">${profile.per_session_rate}</p>
                </div>
              </div>
              
              <div className="mt-10 border-t border-slate-100 pt-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">About Me</h2>
                <div className="prose prose-teal max-w-none text-slate-600 leading-relaxed">
                  {profile.bio ? (
                    <p className="whitespace-pre-wrap">{profile.bio}</p>
                  ) : (
                    <p className="italic">No biography provided yet.</p>
                  )}
                </div>
              </div>
              
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="mr-2">🧠</span> Modalities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.modalities && profile.modalities.length > 0 ? (
                      profile.modalities.map((mod, idx) => (
                        <span key={idx} className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium border border-teal-100">
                          {mod}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">Not specified</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
                    <span className="mr-2">🌐</span> Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages && profile.languages.length > 0 ? (
                      profile.languages.map((lang, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                          {lang}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">Not specified</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-12 text-center">
                <Link 
                  href={`/book/${slug}`}
                  className="inline-block px-10 py-4 bg-gradient-to-r from-teal-500 to-blue-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  Book a Session
                </Link>
                <p className="text-sm text-slate-500 mt-4">Secure, confidential booking.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
