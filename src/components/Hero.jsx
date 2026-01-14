import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <div id="home" className='text-[#0003]'>
      <div className='max-w-[800px] mt-[-98px] w-full h-screen mx-auto text-center flex flex-col justify-center'>
        <h1 className='text-[#059669] md:text-6xl sm:text-5xl text-4xl font-bold p-1'>De Valley Medical Clinic and Diagnostic Center</h1>  
        <p className='text-black md:text-2xl sm:text-xl text-xl font-semibold pt-6'>Smart Waiting, Better Healing</p>
        <p className='text-black text-lg p-2'>Create a patient account to easily book appointments, check doctors’ availability, and secure your slot ahead of time.</p>
        <Link to="/login?type=staff">
          <button className='text-[#ffff] bg-[#059669] w-[200px] rounded-3xl font-medium my-6 mx-auto py-3'>Admin Login</button>
        </Link>
      </div>
    </div>
  )
}

export default Hero;
