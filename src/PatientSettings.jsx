import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PatientSidebar from '@/components/PatientSidebar';
import { User, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';

function PatientSettings() {
  const navigate = useNavigate();
  const [nav, setNav] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
            fullName: profile.fullName || '',
            age: profile.age || '',
            phoneNumber: profile.phoneNumber || ''
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

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    setHasChanges(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      // Validation
      if (!formData.fullName.trim()) {
        setMessage({ text: 'Full name is required', type: 'error' });
        setIsSaving(false);
        return;
      }

      if (formData.age && (formData.age < 0 || formData.age > 150)) {
        setMessage({ text: 'Please enter a valid age', type: 'error' });
        setIsSaving(false);
        return;
      }

      // Phone validation (basic)
      if (formData.phoneNumber && !/^[0-9+\-\s()]+$/.test(formData.phoneNumber)) {
        setMessage({ text: 'Please enter a valid phone number', type: 'error' });
        setIsSaving(false);
        return;
      }

      //==========================================
      // 🔴 REPLACE FROM HERE Password validation 
      //==========================================
      if (formData.newPassword || formData.confirmPassword) {
        if (!formData.currentPassword) {
          setMessage({ text: 'Current password is required to change password', type: 'error' });
          setIsSaving(false);
          return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
          setMessage({ text: 'New passwords do not match', type: 'error' });
          setIsSaving(false);
          return;
        }

        if (formData.newPassword.length < 6) {
          setMessage({ text: 'New password must be at least 6 characters', type: 'error' });
          setIsSaving(false);
          return;
        }

        // TODO: Call API to update password in Supabase
        // For now, just show message
        setMessage({ text: 'Password change will be implemented with backend', type: 'info' });
      }
      //=========================
      //🔴 REPLACE TO HERE
      //==========================

      //===================================
      //🔴 REPLACE FROM HERE updatedProfile
      //===================================
      const currentEmail = localStorage.getItem('currentPatientEmail');
      if (!currentEmail) {
        setMessage({ text: 'Session expired. Please login again.', type: 'error' });
        setIsSaving(false);
        return;
      }

      const updatedProfile = {
        email: currentEmail, // Use the logged-in email, not the form email
        fullName: formData.fullName.trim(),
        age: formData.age,
        phoneNumber: formData.phoneNumber.trim()
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

  const isProfileComplete = formData.fullName && formData.age && formData.phoneNumber;

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
                <div className={`p-4 rounded-lg border ${
                  message.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
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
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="25"
                      min="0"
                      max="150"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="09171234567"
                      required
                    />
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={handleInputChange}
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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