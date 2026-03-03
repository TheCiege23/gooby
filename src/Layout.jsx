import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Search, 
  Store, 
  Heart, 
  Bell, 
  User, 
  Menu,
  LogOut,
  Settings,
  Package,
  Home
} from "lucide-react";
import AIChatBubble from "@/components/buyer/AIChatBubble";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    setIsAuthenticated(authenticated);
    if (authenticated) {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    }
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
    } finally {
      navigate("/", { replace: true });
      window.location.assign("/");
    }
  };

  const navItems = [
    { name: "Home", page: "Home", icon: Home },
    { name: "Browse Deals", page: "Browse", icon: Search },
    { name: "Map View", page: "MapView", icon: MapPin },
  ];

  const userNavItems = user?.role === "admin" ? [
    { name: "Admin Imports", page: "AdminImports", icon: Bell },
  ] : user?.role === "seller" ? [
    { name: "Dashboard", page: "SellerDashboard", icon: Store },
    { name: "My Products", page: "MyProducts", icon: Package },
  ] : [
    { name: "Saved Deals", page: "SavedDeals", icon: Heart },
    { name: "Deal Alerts", page: "DealAlerts", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <style>{`
        :root {
          --primary: 217 91% 60%;
          --primary-foreground: 0 0% 100%;
        }
      `}</style>
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={isAuthenticated ? createPageUrl("Home") : "/"} className="flex items-center gap-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a300f6b5fff3cc73e48948/a9dedf11b_5aa6bc17-16f3-467f-9da7-97372c9198cc.jpg"
                alt="GOOBY"
                className="h-10 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPageName === item.page
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <div className="hidden md:flex items-center gap-2">
                    {userNavItems.map((item) => (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        className={`p-2 rounded-lg transition-all ${
                          currentPageName === item.page
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                      </Link>
                    ))}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-blue-100 hover:bg-blue-200">
                        <User className="w-5 h-5 text-blue-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium">{user?.full_name || "User"}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <p className="text-xs text-blue-600 capitalize mt-1">{user?.role || "buyer"}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl("Settings")} className="cursor-pointer">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
                >
                  Sign In / Sign Up
                </Button>
              )}

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="flex flex-col gap-4 mt-8">
                    {navItems.map((item) => (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          currentPageName === item.page
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    ))}
                    
                    {isAuthenticated && (
                      <>
                        <div className="h-px bg-gray-200 my-2" />
                        {userNavItems.map((item) => (
                          <Link
                            key={item.page}
                            to={createPageUrl(item.page)}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                              currentPageName === item.page
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      <AIChatBubble isAuthenticated={isAuthenticated} />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="text-lg font-bold text-gray-800">GOOBY</span>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-3">
              <p>© 2024 GOOBY. Find amazing deals from closing stores near you.</p>
              <Link to={createPageUrl("Terms")} className="text-blue-600 hover:underline">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}