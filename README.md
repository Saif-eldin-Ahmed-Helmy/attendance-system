# Smart College Attendance System

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat&logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)
![Tesseract.js](https://img.shields.io/badge/OCR-Tesseract.js-FF6B6B?style=flat)
![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-Hardware-A22846?style=flat&logo=raspberry-pi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Optional-2496ED?style=flat&logo=docker&logoColor=white)

A modern attendance tracking system using the **MERN stack** and **Raspberry Pi** hardware.

It allows students to check in using OCR, keypad, or RFID, and gives teachers full control over attendance, grades, and announcements via a secure web portal.

---

## ✅ Features

- Scan student IDs using OCR  
- Manual entry via keypad if student doesn't have their ID  
- Admin override using RFID  
- Real-time LCD feedback for check-in  
- Teachers and students access web portal  
- Auto-attendance grading based on percentage  
- Secure login with email or Google  
- Role-based access (admin, teacher, student)  
- Announcements and materials per subject  
- Excel export of grades and attendance  

---

## 🖼️ Screenshots

### UI Screens

![Login Page](assets/page1.png)  
![Register Page](assets/page2.png)  
![Subjects List Page](assets/page3.png)  
![Subject Attendance Page](assets/page4.png)  
![Subject Attendance Page (Cont.)](assets/page5.png)  
![Subject Attendance Page (Cont. 2)](assets/page6.png)  
![Students List Page](assets/page7.png)  
![Teachers List Page](assets/page8.png)  
![Announcement List Page](assets/page9.png)  
![Announcement Page](assets/page10.png)  
![Material Page](assets/page11.png)

---

## 🛠️ Tech Stack

- **Frontend**: React.js (Vite), TypeScript, React Router, Bootstrap  
- **Backend**: Node.js, Express.js  
- **Database**: MongoDB (Mongoose)  
- **Auth**: Passport (Local + Google OAuth)  
- **Hardware**: Raspberry Pi, Keypad, RFID Scanner, LCD Display, USB Camera  
- **OCR**: Tesseract.js  
- **Real-time**: WebSocket (simple broadcast)  
- **Packaging (optional)**: Docker  

---

## 🔎 API & Health (when running locally)

- Swagger UI: http://localhost:3001/api-docs/
- Health JSON: http://localhost:3001/health

(Used mainly during development to quickly confirm the server and routes are alive.)

---

### 📹 Demo Video
https://github.com/user-attachments/assets/03798e87-249c-4aa4-8347-67253656a8c5
