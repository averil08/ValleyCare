import React from 'react'
import microscope from '../assets/microscope.png'
import medical from '../assets/medical.png'
import pills from '../assets/pills.png'
import surgery from '../assets/surgery.png'


const Service = () => {
  return (
    <div id="service" className='w-full bg-[#f7f7f7]'>
        <div className='mx-auto text-center flex flex-col justify-center'>
          <h1 className='text-[#059669] md:text-3xl sm:text-2xl text-xl font-bold pt-9 pb-2 uppercase'>De Valley Medical Services</h1>
          <p>Comprehensive healthcare solutions for you and your family.</p>
        </div>

        <div className='w-full py-[10rem] px-4'>
          <div className='max-w-[1240px] mx-auto grid md:grid-cols-2 gap-8'>
            <div className='w-full shadow-xl flex flex-col p-10 my-10 rounded-lg hover:scale-105 duration-300'>
              <img className='w-60 mx-auto mt-[-7rem] '
              src={microscope} alt="/" />
              <h2 className='text-[#555555] md:text-2xl sm:text-xl text-xl font-bold text-center py-3'>Diagnostic Services</h2>
              <ul className='text-justify text-1xl font-normal'>
                <li>✔ Complete Laboratory</li>
                <li>✔ 2-D Echo & ECG</li>
                <li>✔ Ultrasound</li>
                <li>✔ X-Ray</li>
                <li>✔ Drug Test</li>
                <li>✔ Pap Smear</li>
              </ul>
            </div>

            <div className='w-full shadow-xl flex flex-col p-10 my-10 rounded-lg hover:scale-105 duration-300'>
              <img className='w-60 mx-auto mt-[-7rem]'
              src={pills} alt="/" />
              <h2 className='text-[#555555] md:text-2xl sm:text-xl text-xl font-bold text-center py-3'>General Services</h2>
              <ul className='text-justify text-1xl font-normal'>
                <li>✔ Pharmacy</li>
                <li>✔ Vaccinations</li>
                <li>✔ Minor Surgical Procedures</li>
              </ul>
            </div>

             <div className='w-full shadow-xl flex flex-col p-10 my-10 rounded-lg hover:scale-105 duration-300'>
                <img className='w-60 mx-auto mt-[-7rem] '
                src={medical} alt="/" />
                <h2 className='text-[#555555] md:text-2xl sm:text-xl text-xl font-bold text-center py-3'>Medical Specialties</h2>
                <ul className='text-justify text-1xl font-normal'>
                  <li>✔ Internal Medicine</li>
                  <li>✔ Gastroenterology</li>
                  <li>✔ Pulmonology</li>
                  <li>✔ Renal & Transplant</li>
                  <li>✔ Cardiology</li>
                  <li>✔ Infectious Disease</li>
                </ul>
            </div>
            <div className='w-full shadow-xl flex flex-col p-10 my-10 rounded-lg hover:scale-105 duration-300'>
              <img className='w-60 mx-auto mt-[-7rem]'
              src={surgery} alt="/" />
              <h2 className='text-[#555555] md:text-2xl sm:text-xl text-xl font-bold text-center py-3'>Surgical Services</h2>
              <ul className='text-justify text-1xl font-normal'>
                <li>✔ Obstetrics & Gynecology</li>
                <li>✔ Orthopedic Surgery</li>
                <li>✔ General Surgery</li>
                <li>✔ Pediatrics</li>
                <li>✔ ENT-HNS</li>
              </ul>
            </div>
          </div>
        </div>
    </div>
  )
}

export default Service
