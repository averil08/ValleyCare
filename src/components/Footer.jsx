import React from 'react'
import img1 from '../assets/logo-valley.png';

import {
    FaFacebookSquare,
    FaGithubSquare,
    FaInstagram,
    FaTwitterSquare,
} from 'react-icons/fa'

const Footer = () => {
  return (
    <div id="contact" className='max-w-[1240px] mx-auto py-16 px-4 grid lg:grid-cols-3 gap-8 text-black'>
      <div>
        <img className='w-[175px]' src={img1} alt=""/>
        <p className='py-4'>Valleycare streamlines patient flow for clinics — combining queue management, appointment booking, and real-time insights in one simple system.</p>
        <div className='flex justify-between md:w-[75%] my-6'>
            <FaFacebookSquare size={30}/>
            <FaInstagram size={30}/>
            <FaTwitterSquare size={30}/>
            <FaGithubSquare size={30}/>
        </div>
      </div>
      <div className='lg:col-span-2 flex justify-between'>
        <div>
            <h6 className='font-medium text-[#2e8b57]'>Solutions</h6>
            <ul>
                <li className='py-2 text-sm'>Queue Management</li>
                <li className='py-2 text-sm'>Appointment Booking</li>
                <li className='py-2 text-sm'>Real-Time Notifications</li>
                <li className='py-2 text-sm'>Clinic Insights</li>
            </ul>
        </div>

        <div>
            <h6 className='font-medium text-[#2e8b57]'>Support</h6>
            <ul>
                <li className='py-2 text-sm'>System Setup & Training</li>
                <li className='py-2 text-sm'>Licensing & Maintenance</li>
                <li className='py-2 text-sm'>Ticket Expansion</li>
                <li className='py-2 text-sm'>Help Center</li>
            </ul>
        </div>

        <div>
            <h6 className='font-medium text-[#2e8b57]'>Analytics</h6>
            <ul>
                <li className='py-2 text-sm'>Patient Flow Reports</li>
                <li className='py-2 text-sm'>Queue Time Insights</li>
                <li className='py-2 text-sm'>Returning vs New Patient Data</li>
                <li className='py-2 text-sm'>Performance Tracking</li>
            </ul>
        </div>

        <div>
            <h6 className='font-medium text-[#2e8b57]'>About</h6>
            <ul>
                <li className='py-2 text-sm'>Our Story</li>
                <li className='py-2 text-sm'>Mission & Vision</li>
                <li className='py-2 text-sm'>Contact Us</li>
                <li className='py-2 text-sm'>Partnerships</li>
            </ul>
        </div>
      </div>
    </div>
  )
}

export default Footer
