import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button, Chip } from '@heroui/react'
import { Upload, Search } from 'lucide-react'
import UploadPage from './pages/UploadPage'
import SearchPage from './pages/SearchPage'
import ResultsPage from './pages/ResultsPage'

function Navigation() {
  const location = useLocation()
  
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <Navbar 
      className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 shadow-lg border-b border-primary-500/20"
      maxWidth="full"
      isBordered
      isBlurred={false}
      height="72px"
    >
      <NavbarBrand>
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center group-hover:bg-white/25 transition-colors duration-200">
            <svg className="w-5 h-5 text-primary-100" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold bg-gradient-to-r from-white to-primary-100 bg-clip-text text-transparent">
              ContextClip
            </span>
            <Chip 
              size="sm" 
              variant="flat" 
              className="bg-primary-100/20 text-primary-100 text-xs border border-primary-200/30 px-2 py-1"
            >
              AI Meeting Intelligence
            </Chip>
          </div>
        </Link>
      </NavbarBrand>
      
      <NavbarContent justify="end" className="gap-4">
        <NavbarItem>
          <Button
            as={Link}
            to="/"
            variant={isActive('/') ? 'solid' : 'light'}
            size="md"
            className={isActive('/') 
              ? 'bg-white/20 text-white hover:bg-white/30' 
              : 'text-primary-100 hover:bg-white/10 hover:text-white'
            }
            startContent={<Upload className="w-4 h-4" />}
          >
            Upload
          </Button>
        </NavbarItem>
        <NavbarItem>
          <Button
            as={Link}
            to="/search"
            variant={isActive('/search') ? 'solid' : 'light'}
            size="md"
            className={isActive('/search') 
              ? 'bg-white/20 text-white hover:bg-white/30' 
              : 'text-primary-100 hover:bg-white/10 hover:text-white'
            }
            startContent={<Search className="w-4 h-4" />}
          >
            Search
          </Button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="pt-6 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/results/:jobId" element={<ResultsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  )
}

export default App
