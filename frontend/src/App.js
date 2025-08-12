import React, { useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import UI components
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Calendar, Clock, GraduationCap, User, Download, RotateCcw, Camera, Scan, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Teacher Dashboard Component
function TeacherDashboard() {
  const [takeAttendanceData, setTakeAttendanceData] = useState({
    time_slot: '',
    lecture_or_lab: '',
    subject: '',
    faculty: '',
    class_name: '',
    semester: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [getAttendanceData, setGetAttendanceData] = useState({
    class_name: '',
    time_slot: '',
    faculty: '',
    subject: '',
    semester: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [qrResult, setQrResult] = useState(null);
  const [attendanceResults, setAttendanceResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTakeAttendance = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/teacher/create-session`, takeAttendanceData);
      setQrResult(response.data);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create attendance session');
    }
    setLoading(false);
  };

  const handleGetAttendance = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/teacher/get-attendance`, getAttendanceData);
      setAttendanceResults(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      alert('Failed to fetch attendance records');
    }
    setLoading(false);
  };

  const handleDownloadAttendance = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/teacher/download-attendance`, getAttendanceData, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_${getAttendanceData.class_name}_${getAttendanceData.subject}_${getAttendanceData.date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attendance:', error);
      alert('Failed to download attendance');
    }
  };

  const handleResetAttendance = async () => {
    if (!window.confirm('Are you sure you want to reset all attendance for this session?')) {
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/teacher/reset-attendance`, getAttendanceData);
      alert(response.data.message);
      setAttendanceResults(null);
    } catch (error) {
      console.error('Error resetting attendance:', error);
      alert('Failed to reset attendance');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <GraduationCap className="w-10 h-10 text-indigo-600" />
            Attendance Management System
          </h1>
          <p className="text-lg text-gray-600">Teacher Dashboard</p>
        </div>

        <Tabs defaultValue="take" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white shadow-sm">
            <TabsTrigger value="take" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Take Attendance
            </TabsTrigger>
            <TabsTrigger value="get" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Get Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="take">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Create Attendance Session
                </CardTitle>
                <CardDescription>
                  Fill in the details to generate QR code for student attendance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTakeAttendance} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="time_slot">Time Slot</Label>
                      <Select onValueChange={(value) => setTakeAttendanceData({...takeAttendanceData, time_slot: value})} value={takeAttendanceData.time_slot}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9:00-10:00">9:00 AM - 10:00 AM</SelectItem>
                          <SelectItem value="10:00-11:00">10:00 AM - 11:00 AM</SelectItem>
                          <SelectItem value="11:00-12:00">11:00 AM - 12:00 PM</SelectItem>
                          <SelectItem value="12:00-13:00">12:00 PM - 1:00 PM</SelectItem>
                          <SelectItem value="14:00-15:00">2:00 PM - 3:00 PM</SelectItem>
                          <SelectItem value="15:00-16:00">3:00 PM - 4:00 PM</SelectItem>
                          <SelectItem value="16:00-17:00">4:00 PM - 5:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lecture_or_lab">Type</Label>
                      <Select onValueChange={(value) => setTakeAttendanceData({...takeAttendanceData, lecture_or_lab: value})} value={takeAttendanceData.lecture_or_lab}>
                        <SelectTrigger>
                          <SelectValue placeholder="Lecture or Lab" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lecture">Lecture</SelectItem>
                          <SelectItem value="Lab">Lab</SelectItem>
                          <SelectItem value="Tutorial">Tutorial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={takeAttendanceData.subject}
                        onChange={(e) => setTakeAttendanceData({...takeAttendanceData, subject: e.target.value})}
                        placeholder="Enter subject name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="faculty">Faculty</Label>
                      <Input
                        id="faculty"
                        value={takeAttendanceData.faculty}
                        onChange={(e) => setTakeAttendanceData({...takeAttendanceData, faculty: e.target.value})}
                        placeholder="Enter faculty name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="class_name">Class</Label>
                      <Input
                        id="class_name"
                        value={takeAttendanceData.class_name}
                        onChange={(e) => setTakeAttendanceData({...takeAttendanceData, class_name: e.target.value})}
                        placeholder="Enter class name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="semester">Semester</Label>
                      <Select onValueChange={(value) => setTakeAttendanceData({...takeAttendanceData, semester: value})} value={takeAttendanceData.semester}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Semester 1</SelectItem>
                          <SelectItem value="2">Semester 2</SelectItem>
                          <SelectItem value="3">Semester 3</SelectItem>
                          <SelectItem value="4">Semester 4</SelectItem>
                          <SelectItem value="5">Semester 5</SelectItem>
                          <SelectItem value="6">Semester 6</SelectItem>
                          <SelectItem value="7">Semester 7</SelectItem>
                          <SelectItem value="8">Semester 8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={takeAttendanceData.date}
                        onChange={(e) => setTakeAttendanceData({...takeAttendanceData, date: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {loading ? 'Creating Session...' : 'Generate QR Code'}
                  </Button>
                </form>

                {qrResult && (
                  <Card className="mt-6 bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-5 h-5" />
                        Attendance Session Created
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                        <img src={qrResult.qr_code} alt="QR Code" className="w-48 h-48 mx-auto" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Session ID: <Badge variant="outline">{qrResult.session_id}</Badge></p>
                        <p className="text-sm text-gray-600">
                          Share this QR code with students to mark their attendance
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="get">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-600" />
                  View Attendance Records
                </CardTitle>
                <CardDescription>
                  Search and manage attendance records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGetAttendance} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="get_class_name">Class</Label>
                      <Input
                        id="get_class_name"
                        value={getAttendanceData.class_name}
                        onChange={(e) => setGetAttendanceData({...getAttendanceData, class_name: e.target.value})}
                        placeholder="Enter class name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="get_time_slot">Time Slot</Label>
                      <Select onValueChange={(value) => setGetAttendanceData({...getAttendanceData, time_slot: value})} value={getAttendanceData.time_slot}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9:00-10:00">9:00 AM - 10:00 AM</SelectItem>
                          <SelectItem value="10:00-11:00">10:00 AM - 11:00 AM</SelectItem>
                          <SelectItem value="11:00-12:00">11:00 AM - 12:00 PM</SelectItem>
                          <SelectItem value="12:00-13:00">12:00 PM - 1:00 PM</SelectItem>
                          <SelectItem value="14:00-15:00">2:00 PM - 3:00 PM</SelectItem>
                          <SelectItem value="15:00-16:00">3:00 PM - 4:00 PM</SelectItem>
                          <SelectItem value="16:00-17:00">4:00 PM - 5:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="get_faculty">Faculty</Label>
                      <Input
                        id="get_faculty"
                        value={getAttendanceData.faculty}
                        onChange={(e) => setGetAttendanceData({...getAttendanceData, faculty: e.target.value})}
                        placeholder="Enter faculty name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="get_subject">Subject</Label>
                      <Input
                        id="get_subject"
                        value={getAttendanceData.subject}
                        onChange={(e) => setGetAttendanceData({...getAttendanceData, subject: e.target.value})}
                        placeholder="Enter subject name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="get_semester">Semester</Label>
                      <Select onValueChange={(value) => setGetAttendanceData({...getAttendanceData, semester: value})} value={getAttendanceData.semester}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Semester 1</SelectItem>
                          <SelectItem value="2">Semester 2</SelectItem>
                          <SelectItem value="3">Semester 3</SelectItem>
                          <SelectItem value="4">Semester 4</SelectItem>
                          <SelectItem value="5">Semester 5</SelectItem>
                          <SelectItem value="6">Semester 6</SelectItem>
                          <SelectItem value="7">Semester 7</SelectItem>
                          <SelectItem value="8">Semester 8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="get_date">Date</Label>
                      <Input
                        id="get_date"
                        type="date"
                        value={getAttendanceData.date}
                        onChange={(e) => setGetAttendanceData({...getAttendanceData, date: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {loading ? 'Fetching Records...' : 'Get Attendance'}
                  </Button>
                </form>

                {attendanceResults && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Attendance Results
                        </span>
                        <Badge variant="secondary">{attendanceResults.total_attendance} Students</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p><strong>Class:</strong> {attendanceResults.query_info.class_name}</p>
                            <p><strong>Subject:</strong> {attendanceResults.query_info.subject}</p>
                            <p><strong>Faculty:</strong> {attendanceResults.query_info.faculty}</p>
                          </div>
                          <div>
                            <p><strong>Time Slot:</strong> {attendanceResults.query_info.time_slot}</p>
                            <p><strong>Semester:</strong> {attendanceResults.query_info.semester}</p>
                            <p><strong>Date:</strong> {attendanceResults.query_info.date}</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button onClick={handleDownloadAttendance} className="bg-green-600 hover:bg-green-700">
                            <Download className="w-4 h-4 mr-2" />
                            Download Excel
                          </Button>
                          <Button onClick={handleResetAttendance} variant="destructive">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset Attendance
                          </Button>
                        </div>

                        <Separator />

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {attendanceResults.records.map((record, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div>
                                <p className="font-medium">{record.student_name}</p>
                                <p className="text-sm text-gray-600">{record.enrollment_number} • {record.email}</p>
                              </div>
                              <Badge variant="outline">
                                {new Date(record.timestamp).toLocaleTimeString()}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Student Attendance Component
function StudentAttendance() {
  const [searchParams] = useSearchParams();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [authData, setAuthData] = useState({
    name: '',
    enrollment_number: '',
    email: ''
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const sessionId = searchParams.get('session_id');

  React.useEffect(() => {
    if (sessionId) {
      fetchSessionInfo();
    }
  }, [sessionId]);

  const fetchSessionInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/session/${sessionId}`);
      setSessionInfo(response.data.session_info);
    } catch (error) {
      console.error('Error fetching session info:', error);
      alert('Invalid or expired session');
    }
  };

  const handleAuthentication = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/student/authenticate`, {
        session_id: sessionId,
        email: authData.email,
        name: authData.name,
        enrollment_number: authData.enrollment_number
      });
      
      setIsAuthenticated(true);
      alert('Authentication successful! Please take your selfie.');
    } catch (error) {
      console.error('Authentication error:', error);
      alert(error.response?.data?.detail || 'Authentication failed');
    }
    setLoading(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please allow camera permission.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        setSelfie(blob);
        stopCamera();
      }, 'image/jpeg', 0.8);
    }
  };

  const submitAttendance = async () => {
    if (!selfie) {
      alert('Please take a selfie first');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('student_name', authData.name);
      formData.append('enrollment_number', authData.enrollment_number);
      formData.append('email', authData.email);
      formData.append('selfie', selfie, 'selfie.jpg');

      const response = await axios.post(`${API_BASE_URL}/api/student/submit-attendance`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setCompleted(true);
      alert('Attendance marked successfully!');
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert(error.response?.data?.detail || 'Failed to submit attendance');
    }
    setLoading(false);
  };

  if (!sessionInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Loading Session...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-green-800">
              <CheckCircle className="w-8 h-8" />
              Attendance Marked!
            </CardTitle>
            <CardDescription>
              Thank you for marking your attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Subject:</strong> {sessionInfo.subject}</p>
              <p><strong>Faculty:</strong> {sessionInfo.faculty}</p>
              <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Scan className="w-8 h-8 text-indigo-600" />
            Student Attendance
          </h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
            <CardDescription>
              Please verify the session details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              <div>
                <p><strong>Subject:</strong> {sessionInfo.subject}</p>
                <p><strong>Faculty:</strong> {sessionInfo.faculty}</p>
                <p><strong>Type:</strong> {sessionInfo.lecture_or_lab}</p>
              </div>
              <div>
                <p><strong>Class:</strong> {sessionInfo.class_name}</p>
                <p><strong>Time:</strong> {sessionInfo.time_slot}</p>
                <p><strong>Date:</strong> {sessionInfo.date}</p>
              </div>
            </div>

            {!isAuthenticated ? (
              <form onSubmit={handleAuthentication} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student_name">Full Name</Label>
                  <Input
                    id="student_name"
                    value={authData.name}
                    onChange={(e) => setAuthData({...authData, name: e.target.value})}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrollment">Enrollment Number</Label>
                  <Input
                    id="enrollment"
                    value={authData.enrollment_number}
                    onChange={(e) => setAuthData({...authData, enrollment_number: e.target.value})}
                    placeholder="Enter your enrollment number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Charusat Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={authData.email}
                    onChange={(e) => setAuthData({...authData, email: e.target.value})}
                    placeholder="yourname@charusat.edu.in"
                    pattern=".*@charusat\.edu\.in$"
                    required
                  />
                  <p className="text-xs text-gray-600">Only @charusat.edu.in emails are allowed</p>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {loading ? 'Authenticating...' : 'Verify & Continue'}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">Take Your Selfie</h3>
                  
                  {!cameraStream && !selfie && (
                    <Button onClick={startCamera} className="bg-indigo-600 hover:bg-indigo-700">
                      <Camera className="w-4 h-4 mr-2" />
                      Start Camera
                    </Button>
                  )}

                  {cameraStream && (
                    <div className="space-y-4">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full max-w-md mx-auto rounded-lg border"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button onClick={captureSelfie} className="bg-green-600 hover:bg-green-700">
                          <Camera className="w-4 h-4 mr-2" />
                          Capture
                        </Button>
                        <Button onClick={stopCamera} variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {selfie && (
                    <div className="space-y-4">
                      <img 
                        src={URL.createObjectURL(selfie)} 
                        alt="Captured selfie" 
                        className="w-full max-w-md mx-auto rounded-lg border"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button onClick={submitAttendance} disabled={loading} className="bg-green-600 hover:bg-green-700">
                          {loading ? 'Submitting...' : 'Submit Attendance'}
                        </Button>
                        <Button onClick={() => {setSelfie(null); startCamera();}} variant="outline">
                          Retake
                        </Button>
                      </div>
                    </div>
                  )}

                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// QR Scanner Component (simulated for demo)
function QRScanner() {
  const navigate = useNavigate();
  const [manualSessionId, setManualSessionId] = useState('');

  const handleManualEntry = (e) => {
    e.preventDefault();
    if (manualSessionId.trim()) {
      navigate(`/student/attendance?session_id=${manualSessionId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-indigo-600" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>
            Scan QR code or enter session ID manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center text-gray-500">
                <Scan className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">QR Scanner Area</p>
                <p className="text-xs">(Demo Mode)</p>
              </div>
            </div>

            <Separator />

            <form onSubmit={handleManualEntry} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session_id">Or Enter Session ID</Label>
                <Input
                  id="session_id"
                  value={manualSessionId}
                  onChange={(e) => setManualSessionId(e.target.value)}
                  placeholder="Enter session ID"
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Continue to Attendance
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<TeacherDashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/student" element={<QRScanner />} />
          <Route path="/student/attendance" element={<StudentAttendance />} />
          <Route path="*" element={<TeacherDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;