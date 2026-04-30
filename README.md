# ColdChain Sentinel 🧊

A professional vaccine cold storage monitoring system built with modern web technologies.

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for fast development
- **React Router** for navigation
- **Recharts** for data visualization
- **Socket.IO Client** for real-time updates
- **Lucide React** for icons

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Socket.IO** for real-time communication
- **MongoDB** with Mongoose
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Helmet** for security
- **Winston** for logging

## 📁 Project Structure

```
coldchain-sentinel/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Node.js backend API
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   ├── package.json
│   └── .env
└── README.md
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coldchain-sentinel
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   # Server runs on http://localhost:5000
   ```

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

## 📋 Features

### Core Modules
- **🏠 Dashboard**: Real-time monitoring of temperature, humidity, and device status
- **🔧 Device Management**: Register and control IoT devices remotely
- **👥 User Management**: RBAC system with dynamic permissions
- **📍 Location Management**: Health centers and room assignments
- **🚨 Alert System**: Temperature, power, and device offline alerts
- **📊 Reports**: PDF/CSV export with daily/monthly analytics
- **🤖 AI Predictions**: Temperature anomaly and device failure predictions
- **🔐 Security**: JWT authentication with audit logging

### Dashboard Features
- Live temperature monitoring
- Humidity tracking
- External air quality monitoring
- Device online/offline status
- Active alerts panel
- Power status monitoring
- Interactive charts
- Prediction cards

### Device Management
- IoT device registration
- Location assignment
- Remote system control (ON/OFF)
- Fan control
- Threshold configuration
- Remote device restart

## 🎯 Current Status

✅ **Completed**
- Project structure setup
- Frontend initialization (React + TypeScript + Tailwind)
- Backend initialization (Node.js + Express + TypeScript)
- Socket.IO real-time communication setup
- Basic development servers running

🔄 **In Progress**
- MongoDB connection and schemas
- JWT authentication system
- Dashboard layout and routing

📋 **Next Steps**
- User authentication and authorization
- Device management system
- Real-time dashboard components
- Alert system implementation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🆘 Support

For support and questions, please open an issue in the repository.
