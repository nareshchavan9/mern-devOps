import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, Mail, Phone, Shield, Calendar } from "lucide-react";
import { authService } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  age: z.string()
    .refine((val) => !val || !isNaN(parseInt(val)), "Age must be a number")
    .refine((val) => !val || parseInt(val) >= 18, "You must be at least 18 years old")
    .refine((val) => !val || parseInt(val) <= 120, "Please enter a valid age")
    .optional()
    .or(z.literal("")),
  voterID: z.string().min(6, "Voter ID must be at least 6 characters"),
});

const Profile = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    age: "",
    role: "",
    voterID: "",
    isActive: true
  });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    age: "",
    voterID: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await authService.getProfile();
      const profileData = {
        fullName: data.fullName || "",
        email: data.email || "",
        phone: data.phone || "",
        age: data.age?.toString() || "",
        role: data.role || "",
        voterID: data.voterID || "",
        isActive: data.isActive || true
      };
      setProfile(profileData);
      setFormData(profileData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for age input
    if (name === 'age') {
      // Only allow numbers and empty string
      if (value === '' || /^\d+$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    try {
      profileSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const updatedData = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
        phone: formData.phone || undefined
      };
      
      await authService.updateProfile(updatedData);
      await fetchProfile(); // Refresh the profile data
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/");
  };

  const handleDeactivateAccount = async () => {
    try {
      setIsLoading(true);
      const response = await authService.deactivateProfile();
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Your account has been deleted",
          variant: "default",
        });
        
        // Clear all user data from localStorage
        authService.logout();
        
        // Redirect to home page
        navigate("/");
      } else {
        throw new Error(response.message || 'Failed to delete account');
      }
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDeactivateConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4 md:px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">Profile</h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <User className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>View and update your profile information.</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={validationErrors.fullName ? "border-red-500" : ""}
                    />
                    {validationErrors.fullName && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.fullName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={validationErrors.email ? "border-red-500" : ""}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1234567890"
                      className={validationErrors.phone ? "border-red-500" : ""}
                    />
                    {validationErrors.phone && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      min="18"
                      max="120"
                      value={formData.age}
                      onChange={handleInputChange}
                      className={validationErrors.age ? "border-red-500" : ""}
                    />
                    {validationErrors.age && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.age}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="voterID">Voter ID</Label>
                    <Input
                      id="voterID"
                      name="voterID"
                      value={formData.voterID}
                      onChange={handleInputChange}
                      className={validationErrors.voterID ? "border-red-500" : ""}
                    />
                    {validationErrors.voterID && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.voterID}</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setValidationErrors({});
                        setFormData(profile);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{profile.fullName}</h3>
                      <p className="text-gray-500">{profile.role}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p>{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p>{profile.phone || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Age</p>
                        <p>{profile.age || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Voter ID</p>
                        <p>{profile.voterID}</p>
                      </div>
                    </div>
                  </div>

                  <CardFooter className="flex flex-col gap-4">
                    {!isEditing && (
                      <>
                        <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => setShowDeactivateConfirm(true)}
                        >
                          Delete Account
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Deactivate Confirmation Dialog */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Account</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to deactivate your account? You will no longer be able to login or participate in elections.
            </p>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setShowDeactivateConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeactivateAccount}
              >
                Deactivate Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 