import requests
import sys
import json
from datetime import datetime, date
import tempfile
import os

class AttendanceSystemTester:
    def __init__(self, base_url="https://edutrack-63.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None
        self.test_data = {
            "session": {
                "time_slot": "9:00-10:00",
                "lecture_or_lab": "Lecture",
                "subject": "Computer Science",
                "faculty": "Dr. Smith",
                "class_name": "CSE-A",
                "semester": "3",
                "date": date.today().isoformat()
            },
            "student": {
                "name": "John Doe",
                "enrollment_number": "CS001",
                "email": "john.doe@charusat.edu.in"
            }
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, response_type='json'):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        if files is None:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                if response_type == 'json':
                    try:
                        response_data = response.json()
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                        return True, response_data
                    except:
                        return True, {}
                else:
                    print(f"   Response size: {len(response.content)} bytes")
                    return True, response.content
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_create_session(self):
        """Test creating attendance session"""
        success, response = self.run_test(
            "Create Attendance Session",
            "POST",
            "api/teacher/create-session",
            200,
            data=self.test_data["session"]
        )
        
        if success and 'session_id' in response:
            self.session_id = response['session_id']
            print(f"   Session ID: {self.session_id}")
            
            # Verify QR code is generated
            if 'qr_code' in response and response['qr_code'].startswith('data:image/png;base64,'):
                print("   ✅ QR code generated successfully")
            else:
                print("   ❌ QR code not generated properly")
                
        return success

    def test_get_session_info(self):
        """Test getting session information"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Session Info",
            "GET",
            f"api/session/{self.session_id}",
            200
        )
        
        if success and 'session_info' in response:
            session_info = response['session_info']
            expected_fields = ['session_id', 'subject', 'faculty', 'class_name', 'time_slot', 'date']
            missing_fields = [field for field in expected_fields if field not in session_info]
            
            if not missing_fields:
                print("   ✅ All required session fields present")
            else:
                print(f"   ❌ Missing fields: {missing_fields}")
                
        return success

    def test_student_authentication(self):
        """Test student authentication"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        auth_data = {
            "session_id": self.session_id,
            "email": self.test_data["student"]["email"],
            "name": self.test_data["student"]["name"],
            "enrollment_number": self.test_data["student"]["enrollment_number"]
        }
        
        success, response = self.run_test(
            "Student Authentication",
            "POST",
            "api/student/authenticate",
            200,
            data=auth_data
        )
        
        if success and 'session_info' in response:
            print("   ✅ Authentication successful with session info")
        
        return success

    def test_student_authentication_invalid_email(self):
        """Test student authentication with invalid email domain"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        auth_data = {
            "session_id": self.session_id,
            "email": "john.doe@gmail.com",  # Invalid domain
            "name": self.test_data["student"]["name"],
            "enrollment_number": self.test_data["student"]["enrollment_number"]
        }
        
        success, response = self.run_test(
            "Student Authentication (Invalid Email)",
            "POST",
            "api/student/authenticate",
            403,  # Should fail with 403
            data=auth_data
        )
        
        return success

    def test_submit_attendance(self):
        """Test submitting attendance with mock selfie"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        # Create a mock image file
        mock_image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
        
        form_data = {
            'session_id': self.session_id,
            'student_name': self.test_data["student"]["name"],
            'enrollment_number': self.test_data["student"]["enrollment_number"],
            'email': self.test_data["student"]["email"]
        }
        
        files = {
            'selfie': ('selfie.png', mock_image_content, 'image/png')
        }
        
        success, response = self.run_test(
            "Submit Attendance",
            "POST",
            "api/student/submit-attendance",
            200,
            data=form_data,
            files=files
        )
        
        return success

    def test_get_attendance(self):
        """Test getting attendance records"""
        query_data = {
            "class_name": self.test_data["session"]["class_name"],
            "time_slot": self.test_data["session"]["time_slot"],
            "faculty": self.test_data["session"]["faculty"],
            "subject": self.test_data["session"]["subject"],
            "semester": self.test_data["session"]["semester"],
            "date": self.test_data["session"]["date"]
        }
        
        success, response = self.run_test(
            "Get Attendance Records",
            "POST",
            "api/teacher/get-attendance",
            200,
            data=query_data
        )
        
        if success:
            total_attendance = response.get('total_attendance', 0)
            records = response.get('records', [])
            print(f"   Total attendance: {total_attendance}")
            print(f"   Records found: {len(records)}")
            
            if total_attendance > 0 and len(records) > 0:
                print("   ✅ Attendance records retrieved successfully")
                # Check if our test student is in the records
                test_student_found = any(
                    record.get('email') == self.test_data["student"]["email"] 
                    for record in records
                )
                if test_student_found:
                    print("   ✅ Test student found in attendance records")
                else:
                    print("   ❌ Test student not found in attendance records")
        
        return success

    def test_download_attendance(self):
        """Test downloading attendance as Excel"""
        query_data = {
            "class_name": self.test_data["session"]["class_name"],
            "time_slot": self.test_data["session"]["time_slot"],
            "faculty": self.test_data["session"]["faculty"],
            "subject": self.test_data["session"]["subject"],
            "semester": self.test_data["session"]["semester"],
            "date": self.test_data["session"]["date"]
        }
        
        success, response_content = self.run_test(
            "Download Attendance Excel",
            "POST",
            "api/teacher/download-attendance",
            200,
            data=query_data,
            response_type='binary'
        )
        
        if success and len(response_content) > 0:
            print("   ✅ Excel file downloaded successfully")
            # Try to save and verify it's a valid Excel file
            try:
                with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as temp_file:
                    temp_file.write(response_content)
                    temp_file_path = temp_file.name
                
                # Check file size
                file_size = os.path.getsize(temp_file_path)
                print(f"   Excel file size: {file_size} bytes")
                
                # Clean up
                os.unlink(temp_file_path)
                
            except Exception as e:
                print(f"   ❌ Error handling Excel file: {e}")
        
        return success

    def test_reset_attendance(self):
        """Test resetting attendance records"""
        query_data = {
            "class_name": self.test_data["session"]["class_name"],
            "time_slot": self.test_data["session"]["time_slot"],
            "faculty": self.test_data["session"]["faculty"],
            "subject": self.test_data["session"]["subject"],
            "semester": self.test_data["session"]["semester"],
            "date": self.test_data["session"]["date"]
        }
        
        success, response = self.run_test(
            "Reset Attendance",
            "POST",
            "api/teacher/reset-attendance",
            200,
            data=query_data
        )
        
        if success and 'deleted_count' in response:
            deleted_count = response['deleted_count']
            print(f"   Deleted {deleted_count} attendance records")
            
        return success

    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 Starting Attendance System Backend Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_create_session,
            self.test_get_session_info,
            self.test_student_authentication,
            self.test_student_authentication_invalid_email,
            self.test_submit_attendance,
            self.test_get_attendance,
            self.test_download_attendance,
            self.test_reset_attendance
        ]
        
        for test in tests:
            test()
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = AttendanceSystemTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())