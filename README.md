# 🏥 AMIETI - Health Management System

A comprehensive full-stack web application for educational institution health management, powered by **Django**, **Next.js**, **PostgreSQL**, and **AI/ML technologies**.

## 🌟 Overview

AMIETI (Medical Information and Educational Technology Integration) is an intelligent health management system designed for educational institutions. It combines traditional healthcare management with cutting-edge AI technology to provide comprehensive wellness support for students, faculty, and healthcare staff.

## ✨ Key Features

### 🤖 AI-Powered Capabilities
- **BERT-based Intent Detection** - Advanced natural language processing for chatbot interactions
- **ICD-11 Diagnosis Detection** - Hybrid rule-based + ML semantic analysis for medical condition identification
- **Predictive Analytics** - Mental and physical health trend analysis
- **WHO API Integration** - International classification of diseases support

### 👥 Multi-Role User Management
- **Students** - Health records, appointments, mood tracking, wellness journey
- **Faculty** - Student health monitoring, permit requests
- **Nurses** - Medical examinations, health assessments, inventory management
- **Counselors** - Mental health support, appointment scheduling
- **Administrators** - System management, analytics, user oversight

### 🏥 Core Healthcare Modules
- **Health Records Management** - Digital permit requests and medical documentation
- **Appointment Scheduling** - Intelligent booking system with availability management
- **Medical Examinations** - Enhanced OCR for form processing and data extraction
- **Mood Tracking** - Daily wellness check-ins with insights
- **Wellness Journey** - Wellness activities and progress tracking

### 📊 Analytics & Reporting
- **Comprehensive Dashboards** - Real-time health metrics and trends
- **Predictive Analytics** - AI-driven health risk assessment
- **Export Capabilities** - PDF reports and data visualization
- **System Logs** - Detailed activity tracking and audit trails

### 💬 hatbot
- **AMIETI Assistant** - Wellness support and guidance
- **Appointment Booking** - Automated scheduling assistance
- **Mood Check-ins** - Conversational wellness monitoring
- **Risk Assessment** - Mental health support

## 🛠 Technology Stack

### Backend
- **Django 4.x** - Python web framework
- **PostgreSQL** - Database
- **Django REST Framework** - API development
- **JWT Authentication** - Secure user authentication
- **BERT/Transformers** - Natural language processing
- **WHO ICD-11 API** - Medical classification integration

### Frontend
- **Next.js 15** - React framework
- **Bootstrap 5** - UI framework
- **Chart.js** - Data visualization
- **React Icons** - Icon library
- **Axios** - HTTP client

### AI/ML Components
- **Fine-tuned BERT Models** - Intent detection and semantic analysis
- **Hybrid Detection System** - Rule-based + ML condition identification
- **Predictive Analytics** - Health trend forecasting
- **Enhanced OCR** - Medical form processing

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Python 3.10+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 12+](https://www.postgresql.org/)
- [Git](https://git-scm.com/) (recommended)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/joyexe/proposal-defense.git
cd amieti
```

### 2. Backend Setup (Django + PostgreSQL)

#### Create Virtual Environment
```bash
cd backend
python -m venv ../env
```

#### Activate Virtual Environment
**Windows:**
```bash
..\env\Scripts\activate
```

**macOS/Linux:**
```bash
source ../env/bin/activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Database Configuration
1. **Create PostgreSQL Database:**
   ```sql
   CREATE DATABASE amietidb;
   ```

2. **Configure Database Settings:**
   Update `backend/settings.py` with your database credentials:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'amietidb',
           'USER': 'your_username',
           'PASSWORD': 'your_password',
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }
   ```

#### Environment Variables
Create a `.env` file in the backend directory:
```env
SECRET_KEY=your_secret_key_here
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
CLIENT_ID=your_who_api_client_id
CLIENT_SECRET=your_who_api_client_secret
```

#### Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

#### Start Backend Server
```bash
python manage.py runserver 8080
```

The backend will be available at: **http://localhost:8080**

### 3. Frontend Setup (Next.js)

#### Install Dependencies
```bash
cd ../frontend
npm install
```

#### Start Development Server
```bash
npm run dev
```

The frontend will be available at: **http://localhost:3000**

## 🎯 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Django)      │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • User Interface│    │ • API Endpoints │    │ • User Data     │
│ • Dashboard     │    │ • AI/ML Models  │    │ • Health Records│
│ • Chatbot UI    │    │ • Business Logic│    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   External APIs │
                       │                 │
                       │ • WHO ICD-11    │
                       │ • Email Service │
                       └─────────────────┘
```

## 🔧 Configuration

### AI/ML Features
The system supports both development and production modes:

- **Development Mode**: Faster startup, basic features
- **Production Mode**: Full AI capabilities, enhanced accuracy

### Email Configuration
Configure SMTP settings for notifications:
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
```

### Security Settings
- JWT token authentication
- CORS configuration for frontend integration
- CSRF protection
- Session management

## 📱 User Roles & Permissions

### Student Access
- Health record management
- Appointment booking
- Mood tracking and wellness journey
- Bulletin board access
- AMIETI chatbot interaction

### Faculty Access
- Student health monitoring
- Permit request approval
- Basic analytics dashboard
- Communication tools

### Healthcare Staff
- Medical examination management
- Inventory tracking
- Patient documentation
- Advanced health analytics

### Administrator Access
- System configuration
- User management
- Comprehensive analytics
- System maintenance

## 🚨 Troubleshooting

### Common Issues

#### Backend Startup Problems
```bash
# Check Python environment
python --version

# Verify dependencies
pip list

# Check database connection
python manage.py check

# Clear cache if needed
python manage.py clearcache
```

#### Frontend Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
netstat -ano | findstr :3000
```

#### Database Issues
```bash
# Reset migrations (if needed)
python manage.py migrate --fake-initial

# Check database connection
python manage.py dbshell
```

### Performance Optimization

#### For Development
- Use development mode for faster startup
- Disable heavy AI features during development
- Use SQLite for local development

#### For Production
- Enable full AI capabilities
- Configure proper database indexing
- Set up caching mechanisms
- Use production-grade web server

## 📊 API Documentation

The system provides RESTful APIs for all major functionalities:

- **Authentication**: JWT-based token system
- **User Management**: CRUD operations for all user types
- **Health Records**: Medical documentation and permit requests
- **Appointments**: Scheduling and management
- **Analytics**: Health metrics and reporting
- **Chatbot**: Conversation endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions:
- Check the troubleshooting section above
- Review system logs in the admin panel
- Contact the development team

---

**AMIETI** - Empowering educational institutions with intelligent health management solutions.
