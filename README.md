# Havenix - Student Housing Platform MVP

Havenix is a revolutionary student housing marketplace that connects university students with trusted landlords offering safe and verified off-campus accommodation.

## 🎯 Key Features

- **Verified Properties**: Every listing is manually vetted for legitimacy and safety
- **Reservation System**: Students pay a reservation fee to unlock full property details
- **Real-time Availability**: Live tracking of available rooms in each property
- **Refund Assurance**: Partial refunds if properties don't match expectations
- **Role-based Access**: Separate dashboards for students and landlords
- **Mobile-first Design**: Optimized for Gen Z users

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Payments**: Paystack API
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx
│   ├── PropertyCard.tsx
│   └── PaystackButton.tsx
├── pages/              # Page components
│   ├── HomePage.tsx
│   ├── ExplorePage.tsx
│   ├── PropertyDetailPage.tsx
│   ├── AuthPage.tsx
│   ├── LandlordDashboard.tsx
│   └── StudentDashboard.tsx
├── context/            # React context providers
│   └── AuthContext.tsx
├── utils/              # Utility functions
│   └── supabase.ts
└── styles/             # Global styles
    └── index.css
```

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Click "Connect to Supabase" in the top right of this interface
3. The database schema will be automatically created

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

### 4. Run the Development Server

```bash
npm run dev
```

## 📊 Database Schema

### Users Table
- Stores user profiles with role-based access (student/landlord)
- Integrated with Supabase Auth

### Properties Table
- Property listings with images, pricing, and availability
- Tier-based categorization (Budget/Standard/Premium)
- Real-time room availability tracking

### Reservations Table
- Tracks student reservations and payment status
- Handles unlock permissions for property details
- Supports refund workflow

## 🔐 Security Features

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Authenticated API endpoints
- Secure payment processing with Paystack

## 🎨 Design System

- **Colors**: Primary (Blue) + Secondary (Purple) gradient system
- **Typography**: Inter font family with consistent sizing
- **Spacing**: 8px grid system
- **Components**: Consistent hover states and micro-interactions
- **Responsive**: Mobile-first design with breakpoints

## 🚀 Deployment

The application is ready for deployment on platforms like:
- Vercel (recommended for React apps)
- Netlify
- Railway
- Render

## 📱 User Flows

### For Students:
1. Browse verified properties
2. Pay reservation fee to unlock details
3. Contact landlord directly
4. Schedule property viewing
5. Request refund if unsatisfied

### For Landlords:
1. Create account and verify identity
2. List properties with images/videos
3. Set pricing and availability
4. Receive notifications for reservations
5. Communicate with interested students

## 🔄 Future Enhancements

- Full rent payment processing
- Automated refund system
- In-app messaging
- Property reviews and ratings
- Mobile app development
- Integration with more universities

## 📞 Support

For technical support or business inquiries:
- Email: support@havenix.com
- WhatsApp: +234-800-000-0000

## 📄 License

This project is proprietary software. All rights reserved.