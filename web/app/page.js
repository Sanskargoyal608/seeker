import Link from 'next/link';

export const metadata = {
  title: 'Seeker - Find Your Therapist',
  description: 'Connect with a licensed therapist today.',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600 mb-6 text-center">
        Welcome to Seeker Web
      </h1>
      <p className="text-xl text-slate-600 mb-10 text-center max-w-2xl">
        Your wellness journey starts here. Explore our public therapist profiles and book a session directly from the web.
      </p>
    </div>
  );
}
