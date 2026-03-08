import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PatientSidebar from '@/components/PatientSidebar';
import { User, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { updateUserPassword } from './lib/supabaseClient';

function PatientSettings() {
  const navigate = useNavigate();
  const [nav, setNav] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    middleName: '',
    surname: '',
    age: '',
    phoneNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  //================================
  //🔴 REPLACE FROM HERE
  //==============================
  const loadProfile = () => {
    try {
      const currentEmail = localStorage.getItem('currentPatientEmail');

      if (currentEmail) {
        // Load profile specific to this email
        const userProfileStr = localStorage.getItem(`userProfile_${currentEmail}`);

        if (userProfileStr) {
          const profile = JSON.parse(userProfileStr);
          console.log('📋 Loading profile for:', currentEmail);
          console.log('📋 Profile data:', profile);

          setFormData(prev => ({
            ...prev,
            email: profile.email || currentEmail,
            firstName: profile.firstName || (profile.fullName ? profile.fullName.split(' ')[0] : ''),
            middleName: profile.middleName || '',
            surname: profile.surname || (profile.fullName && profile.fullName.split(' ').length > 1 ? profile.fullName.substring(profile.fullName.indexOf(' ') + 1) : ''),
            age: profile.age || '',
            phoneNumber: (() => {
              let p = (profile.phoneNumber || '');
              if (p.startsWith('+63')) return '0' + p.slice(3);
              if (p.startsWith('9')) return '0' + p;
              return p;
            })() || ''
          }));
        } else {
          console.log('⚠️ No profile found for:', currentEmail);
          // Set email even if no profile exists yet
          setFormData(prev => ({ ...prev, email: currentEmail }));
        }
      } else {
        console.error('❌ No email found in session');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };
  //=========================================
  //🔴 REPLACE TO HERE
  //=========================================

  const validateField = (id, value, data = formData) => {
    let error = '';
    switch (id) {
      case 'firstName':
        if (!value.trim()) error = 'First name is required';
        break;
      case 'surname':
        if (!value.trim()) error = 'Surname is required';
        break;
      case 'age':
        if (!value) error = 'Age is required';
        else if (value < 0 || value > 150) error = 'Please enter a valid age';
        break;
      case 'phoneNumber':
        if (!value) {
          error = 'Phone number is required';
        } else if (!/^09/.test(value)) {
          error = 'Phone number must start with 09';
        } else if (!/^\d+$/.test(value)) {
          error = 'Phone number must contain only numeric values';
        } else if (value.length !== 11) {
          error = 'Phone number must be exactly 11 digits starting with 09';
        }
        break;
      case 'currentPassword':
        if ((data.newPassword || data.confirmPassword) && !value) {
          error = 'Current password is required to change password';
        }
        break;
      case 'newPassword':
        if (value && value.length < 6) {
          error = 'New password must be at least 6 characters';
        }
        break;
      case 'confirmPassword':
        if (value && data.newPassword && value !== data.newPassword) {
          error = 'New passwords do not match';
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    setTouched(prev => ({ ...prev, [id]: true }));
    setErrors(prev => ({ ...prev, [id]: validateField(id, value) }));
  };

  const handleInputChange = (e) => {
    let { id, value } = e.target;

    if (id === 'phoneNumber') {
      value = value.replace(/\D/g, '');
      if (value.startsWith('9')) value = '0' + value;
      value = value.slice(0, 11);
    }

    // Prevent negative age values if typed manually
    if (id === 'age' && value !== '') {
      value = Math.max(0, parseInt(value, 10)).toString();
      if (isNaN(value)) value = '';
    }

    setFormData(prev => {
      const newData = { ...prev, [id]: value };

      if (touched[id]) {
        setErrors(prevErrors => ({ ...prevErrors, [id]: validateField(id, value, newData) }));
      }

      // Auto-validate related password fields if they are touched
      if (['currentPassword', 'newPassword', 'confirmPassword'].includes(id)) {
        if (touched.currentPassword) {
          setErrors(prevErrors => ({ ...prevErrors, currentPassword: validateField('currentPassword', newData.currentPassword, newData) }));
        }
        if (touched.confirmPassword) {
          setErrors(prevErrors => ({ ...prevErrors, confirmPassword: validateField('confirmPassword', newData.confirmPassword, newData) }));
        }
      }

      return newData;
    });
    setHasChanges(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const currentEmail = localStorage.getItem('currentPatientEmail');
      // Form level validation before submit
      const newErrors = {};
      newErrors.firstName = validateField('firstName', formData.firstName);
      newErrors.surname = validateField('surname', formData.surname);
      newErrors.age = validateField('age', formData.age);
      newErrors.phoneNumber = validateField('phoneNumber', formData.phoneNumber);

      if (formData.newPassword || formData.confirmPassword) {
        newErrors.currentPassword = validateField('currentPassword', formData.currentPassword);
        newErrors.newPassword = validateField('newPassword', formData.newPassword);
        newErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword);
      }

      // Check if any errors exist
      if (Object.values(newErrors).some(err => err !== '')) {
        setErrors(prev => ({ ...prev, ...newErrors }));
        setTouched({
          firstName: true, surname: true, age: true, phoneNumber: true,
          ...(formData.newPassword || formData.confirmPassword ? { currentPassword: true, newPassword: true, confirmPassword: true } : {})
        });
        setMessage({ text: 'Please fix the errors in the form', type: 'error' });
        setIsSaving(false);
        return;
      }

      //==========================================
      // 🔴 REPLACE FROM HERE Password validation 
      //==========================================
      if (formData.newPassword || formData.confirmPassword) {
        // We checked these errors above
        if (newErrors.currentPassword || newErrors.newPassword || newErrors.confirmPassword) {
          setIsSaving(false);
          return;
        }

        const passwordResult = await updateUserPassword(
          currentEmail,
          formData.currentPassword,
          formData.newPassword
        );

        if (!passwordResult.success) {
          setMessage({ text: passwordResult.error, type: 'error' });
          setErrors(prev => ({ ...prev, currentPassword: passwordResult.error }));
          setTouched(prev => ({ ...prev, currentPassword: true }));
          setIsSaving(false);
          return;
        }
      }
      //=========================
      //🔴 REPLACE TO HERE
      //==========================

      //===================================
      //🔴 REPLACE FROM HERE updatedProfile
      //===================================
      if (!currentEmail) {
        setMessage({ text: 'Session expired. Please login again.', type: 'error' });
        setIsSaving(false);
        return;
      }

      const fullNameCombined = `${formData.firstName.trim()} ${formData.middleName.trim() ? formData.middleName.trim() + ' ' : ''}${formData.surname.trim()}`.trim();

      const updatedProfile = {
        email: currentEmail, // Use the logged-in email, not the form email
        fullName: fullNameCombined,
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        surname: formData.surname.trim(),
        age: formData.age,
        phoneNumber: `+63${formData.phoneNumber.trim().replace(/^0/, "")}`
      };

      // Save to localStorage with email key
      const profileKey = `userProfile_${currentEmail}`;
      localStorage.setItem(profileKey, JSON.stringify(updatedProfile));

      console.log('✅ Profile saved for:', currentEmail);
      console.log('✅ Profile data:', updatedProfile);

      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setHasChanges(false);
      //===================================
      //🔴 REPLACE TO HERE
      //===================================

      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setTouched(prev => ({
        ...prev,
        currentPassword: false,
        newPassword: false,
        confirmPassword: false
      }));
      setErrors(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      // ADDED 1/31/26
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('from') === 'patient-sidebar') {
        setTimeout(() => {
          // Add a flag to indicate returning from settings
          navigate('/checkin?from=patient-sidebar&type=appointment&restored=true');
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ text: 'Failed to save profile. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const isProfileComplete = formData.firstName && formData.surname && formData.age && formData.phoneNumber;

  return (
    <div className="flex w-full min-h-screen">
      <PatientSidebar nav={nav} handleNav={() => setNav(!nav)} />

      <div className="flex-1 bg-gray-50 ml-0 md:ml-52 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto pt-12 lg:pt-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <User className="w-6 h-6" />
                Profile Settings
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage your personal information and account settings
              </p>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Alert Messages */}
              {message.text && (
                <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
                  message.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
                    'bg-blue-50 border-blue-300 text-blue-800'
                  }`}>
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              )}

              {!isProfileComplete && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      Profile Incomplete
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Please complete all required fields to book appointments
                    </p>
                  </div>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name <span className="text-red-600">*</span></Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.firstName && errors.firstName ? "border-red-500" : ""}
                      placeholder="Juan"
                      required
                    />
                    {touched.firstName && errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      placeholder="Dela"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surname">Surname <span className="text-red-600">*</span></Label>
                    <Input
                      id="surname"
                      value={formData.surname}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.surname && errors.surname ? "border-red-500" : ""}
                      placeholder="Cruz"
                      required
                    />
                    {touched.surname && errors.surname && <p className="text-xs text-red-500">{errors.surname}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age <span className="text-red-600">*</span></Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.age && errors.age ? "border-red-500" : ""}
                      placeholder="25"
                      min="0"
                      max="150"
                      required
                    />
                    {touched.age && errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number <span className="text-red-600">*</span></Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm font-medium">
                        +63
                      </span>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`rounded-l-none ${touched.phoneNumber && errors.phoneNumber ? "border-red-500" : ""}`}
                        placeholder="09171234567"
                        required
                        maxLength={11}
                        minLength={11}
                        pattern="\d{11}"
                      />
                    </div>
                    {touched.phoneNumber && errors.phoneNumber && <p className="text-xs text-red-500">{errors.phoneNumber}</p>}
                  </div>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-800">Change Password (Optional)</h3>
                <p className="text-sm text-gray-600">Leave blank to keep current password</p>

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.currentPassword && errors.currentPassword ? "border-red-500 pr-10" : "pr-10"}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.currentPassword && errors.currentPassword && <p className="text-xs text-red-500">{errors.currentPassword}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.newPassword && errors.newPassword ? "border-red-500 pr-10" : "pr-10"}
                      placeholder="Enter new password (min 6 characters)"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.newPassword && errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={touched.confirmPassword && errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                      placeholder="Re-enter new password"
                    />
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 space-y-3 border-t">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !hasChanges}
                  className="w-full bg-green-600 hover:bg-green-700 py-6"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/homepage')}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="text-blue-800">
                  <strong>💡 Tip:</strong> Keep your profile up to date to make booking appointments faster and easier!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default PatientSettings;