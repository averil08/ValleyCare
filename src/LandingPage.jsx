import React from 'react'
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Service from './components/Service';
import Footer from './components/Footer';

function LandingPage() {
  return (
    <div>
     <Navbar/>
     <Hero/>
     <Service/>
     <Footer/>
    </div>
  );
}

export default LandingPage;