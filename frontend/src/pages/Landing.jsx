import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Real-Time Messaging',
    description: 'Chat instantly with friends and colleagues using secure, real-time messaging.',
  },
  {
    title: 'Cloud Backup',
    description: 'Backup your conversations to Google Drive and never lose your important messages.',
  },
  {
    title: 'Media Sharing',
    description: 'Share images, videos, and files seamlessly within your chats.',
  },
  {
    title: 'Voice & Video Calls',
    description: 'Connect face-to-face with high-quality voice and video calls.',
  },
  {
    title: 'Customizable Profiles',
    description: 'Personalize your profile with avatars, status, and more.',
  },
  {
    title: 'End-to-End Encryption',
    description: 'Your conversations are private and secure with industry-standard encryption.',
  },
];

const Landing = () => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex flex-col">
    <header className="py-8 px-4 text-center">
      <h1 className="text-5xl font-extrabold text-indigo-700 mb-2">NexusChat</h1>
      <p className="text-xl text-gray-700 max-w-2xl mx-auto">
        The next-generation chat platform for seamless, secure, and smart communication. Connect, collaborate, and share—anytime, anywhere.
      </p>
      <div className="mt-6 flex justify-center gap-4">
        <Link to="/login" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold shadow hover:bg-indigo-700 transition">Sign In</Link>
        <Link to="/register" className="px-6 py-2 bg-white border border-indigo-600 text-indigo-700 rounded-lg font-semibold shadow hover:bg-indigo-50 transition">Create Account</Link>
      </div>
    </header>
    <main className="flex-1 px-4 py-8 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-indigo-800 mb-8">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 border-indigo-500">
            <h3 className="text-xl font-semibold text-indigo-700 mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </main>
    <footer className="py-6 text-center text-gray-500 text-sm border-t mt-8">
      &copy; {new Date().getFullYear()} NexusChat. All rights reserved.
    </footer>
  </div>
);

export default Landing; 