import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Building2, BarChart3, Menu, X, Loader2 } from "lucide-react"; // Added Loader2 for loading state
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext"; // Using the updated context

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const location = useLocation();

  const {
    accountId,
    balance,
    connectWallet,
    disconnectWallet,
    isConnected,
    isInitializing, // Get the initializing status
    shortAccount,
  } = useWallet();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/properties", label: "Properties", icon: Building2 },
    { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
    // Add test page link for easy access during development
    { path: "/test-transfer", label: "Test Transfer", icon: BarChart3 }, // Example icon
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleConnect = async () => {
    setIsConnecting(true); // Indicate connection attempt starts
    console.log("Navigation: handleConnect called.");
    try {
        await connectWallet(); // Call context's connect function
        console.log("Navigation: connectWallet resolved.");
    } catch (err) {
      // Error is already logged in the context, but can add UI feedback here
      console.error("Navigation: Wallet connection failed:", err);
      // Maybe show a toast notification to the user
    } finally {
        setIsConnecting(false); // Indicate connection attempt finished
        console.log("Navigation: handleConnect finished.");
    }
  };

  const handleDisconnect = async () => {
       console.log("Navigation: handleDisconnect called.");
       await disconnectWallet();
       console.log("Navigation: disconnectWallet finished.");
  }

  // Determine button state based on initialization and connection status
  const getConnectButton = (isMobile = false) => {
    if (isInitializing) {
        return (
            <Button variant="ghost" size="sm" disabled className={isMobile ? "w-full justify-start" : ""}>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Initializing...
            </Button>
        );
    }

    if (!isConnected) {
        return (
             <Button
                variant="hero"
                size="sm"
                onClick={handleConnect}
                disabled={isConnecting}
                className={isMobile ? "w-full" : ""}
             >
                {isConnecting ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    "Connect Wallet"
                )}
            </Button>
        );
    }

    // Connected State
    return (
        <div className={`flex items-center ${isMobile ? 'flex-col space-y-2 items-start' : 'space-x-3'}`}>
            <span className={`text-sm text-muted-foreground ${isMobile ? 'text-center w-full' : ''}`}>
                {shortAccount || accountId} {balance ? `| ${balance} ℏ` : ""}
            </span>
            <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                className={isMobile ? "w-full" : ""}
            >
                Disconnect
            </Button>
        </div>
    );
};


  return (
    <nav className="bg-card border-b shadow-elegant sticky top-0 z-50"> {/* Added sticky positioning */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary">Equivest</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-smooth text-sm font-medium ${ // Adjusted size/font
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground shadow-sm" // Added shadow for active
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Wallet Button (desktop) */}
            <div className="pl-4"> {/* Added padding */}
                 {getConnectButton(false)}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth" // Added focus styles
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu" // Accessibility
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-smooth ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsOpen(false)} // Close menu on click
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="pt-4 border-t mt-4"> {/* Added separator */}
                {/* Wallet Button (mobile) */}
                 {getConnectButton(true)}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
