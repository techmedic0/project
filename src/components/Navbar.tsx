import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, User, LogOut, Plus, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
      setIsMobileMenuOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-white shadow-lg sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center shadow-md">
              <Home className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Havenix
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link
                  to="/explore"
                  className="text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Explore
                </Link>
                
                {profile?.role === 'landlord' && (
                  <Link
                    to="/dashboard/landlord"
                    className="flex items-center space-x-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-5 py-2.5 rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 transform hover:scale-105 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Property</span>
                  </Link>
                )}

                <Link
                  to={`/dashboard/${profile?.role}`}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-gray-700 hover:text-red-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/explore"
                  className="text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Explore
                </Link>
                <Link
                  to="/auth"
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-2.5 rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 transform hover:scale-105 shadow-md"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden border-t border-gray-200 bg-white overflow-hidden"
            >
              <div className="px-2 pt-4 pb-6 space-y-2">
                {user ? (
                  <>
                    <Link
                      to="/explore"
                      onClick={closeMobileMenu}
                      className="flex items-center px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
                    >
                      <span>Explore Properties</span>
                    </Link>
                    
                    {profile?.role === 'landlord' && (
                      <Link
                        to="/dashboard/landlord"
                        onClick={closeMobileMenu}
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600 transition-all duration-200 shadow-md"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Add Property</span>
                      </Link>
                    )}

                    <Link
                      to={`/dashboard/${profile?.role}`}
                      onClick={closeMobileMenu}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
                    >
                      <User className="w-5 h-5" />
                      <span>My Dashboard</span>
                    </Link>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="px-4 py-3 bg-gray-50 rounded-xl mb-3">
                        <p className="text-sm font-medium text-gray-900">{profile?.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      to="/explore"
                      onClick={closeMobileMenu}
                      className="flex items-center px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
                    >
                      <span>Explore Properties</span>
                    </Link>
                    <Link
                      to="/auth"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center px-4 py-3 rounded-xl text-base font-medium bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600 transition-all duration-200 shadow-md"
                    >
                      <span>Get Started</span>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}

export default Navbar