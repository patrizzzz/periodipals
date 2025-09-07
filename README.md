# PeriodiPal 🌟

An interactive Progressive Web App (PWA) designed to educate students about health, puberty, and hygiene through engaging modules, quizzes, and interactive activities.

## Features 🚀

- **Interactive Learning Modules**
  - Puberty Education
  - Reproductive System
  - Hygiene & Handwashing
  - Menstrual Cycle
  - PMS Education
  - Adolescent Health Situation (AHS)

- **Teacher Dashboard**
  - Resource Management
  - Student Progress Tracking
  - Quiz Creation & Management
  - Class Activities
  - Student Analytics

- **Student Features**
  - Personalized Learning Path
  - Progress Tracking
  - Interactive Quizzes
  - Mini-games
  - Real-time Feedback

- **Technical Features**
  - Progressive Web App (PWA)
  - Offline Support
  - Real-time Firebase Backend
  - Responsive Design
  - Interactive UI/UX

## Tech Stack 💻

- **Frontend**
  - HTML5, CSS3, JavaScript
  - Progressive Web App (PWA)
  - Service Workers
  - Responsive Design
  - Font Awesome Icons

- **Backend**
  - Python (Flask)
  - Firebase (Auth, Firestore, Storage)
  - SQLite (for lesson info)

- **Database**
  - Firebase Firestore
  - SQLite (local)

## Project Structure 📁

```
interactive PWA/
├── static/
│   ├── css/
│   ├── js/
│   └── img/
├── templates/
│   ├── teacher/
│   └── student/
├── routes/
│   ├── admin_routes.py
│   ├── main_routes.py
│   └── teacher_routes.py
├── utils/
└── app.py
```

## Setup & Installation 🔧

1. Clone the repository
```bash
git clone https://github.com/yourusername/periodipal.git
cd periodipal
```

2. Install dependencies
```bash
pip install -r requirements.txt
```

3. Set up Firebase
   - Create a Firebase project
   - Add your Firebase config to the project
   - Enable Authentication and Firestore

4. Run the application
```bash
python app.py
```

## Environment Variables 🔐

Create a `.env` file in the root directory with:

```env
FLASK_APP=app.py
FLASK_ENV=development
FIREBASE_CONFIG=your_firebase_config_json
```

## Contributing 🤝

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📝

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.