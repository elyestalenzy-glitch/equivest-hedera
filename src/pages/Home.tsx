import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Coins, RefreshCw, ArrowRight } from "lucide-react";
import heroProperty from "@/assets/hero-meridian.jpg";
// Import useNavigate hook from react-router-dom to handle redirection
import { useNavigate } from "react-router-dom";
// Import useWallet from the context file
import { useWallet } from "@/context/WalletContext";

const Home = () => {
    // Access navigation and wallet context
    const navigate = useNavigate();
    const { connectWallet, isConnected } = useWallet();

    const handleStartInvesting = () => {
        // Log for debugging
        console.log("Start Investing button clicked.");
        
        if (isConnected) {
            // If already connected, redirect directly to /properties
            console.log("Wallet connected, redirecting to /properties.");
            navigate("/properties");
        } else {
            // If disconnected, attempt to connect first
            console.log("Wallet disconnected, attempting connection...");
            connectWallet().then(() => {
                // If connection is successful, then navigate
                if (isConnected) { // Check state again after connection attempt
                   navigate("/properties");
                }
            }).catch(err => {
                console.error("Connection failed, not redirecting:", err);
                // Optionally inform the user connection failed
            });
        }
    };

    const features = [
        {
            icon: Coins,
            title: "Easy fractional investment in real estate",
            description: "Invest in premium properties with as little as $100 through tokenized ownership."
        },
        {
            icon: Shield,
            title: "Transparent ownership verified on Hedera",
            description: "Every token is backed by real property ownership, recorded immutably on Hedera blockchain."
        },
        {
            icon: RefreshCw,
            title: "Redeem tokens anytime",
            description: "Liquidity when you need it - redeem your property tokens back to cash (simulated in MVP)."
        }
    ];

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-glow to-accent">
                <div className="container mx-auto px-4 py-20 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
                                Invest in Real Estate with{" "}
                                <span className="text-accent-light">Fractional Ownership</span>{" "}
                                on Hedera
                            </h1>
                            <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl">
                                Buy property tokens, track your investments, and redeem your tokens — all on the blockchain.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button 
                                    variant="hero" 
                                    size="lg"
                                    onClick={handleStartInvesting} // Call the new handler
                                    className="text-lg px-8 py-4 bg-background text-primary hover:bg-background/90"
                                >
                                    Start Investing {/* Change button text */}
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                                {/* REMOVED: The 'Learn More' Button is removed as requested */}
                            </div>
                        </div>
                        <div className="relative">
                            <img 
                                src={heroProperty} 
                                alt="Modern real estate investment opportunity"
                                className="w-full h-[400px] object-cover rounded-2xl shadow-elegant"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent rounded-2xl" />
                        </div>
                    </div>
                </div>
                
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
                    <div className="absolute top-20 right-20 w-32 h-32 border border-primary-foreground rounded-full" />
                    <div className="absolute bottom-40 right-40 w-20 h-20 border border-accent-light rounded-full" />
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                            Why Choose Equivest?
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Revolutionary real estate investment powered by Hedera blockchain technology
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <Card key={index} className="shadow-card hover:shadow-elegant transition-smooth">
                                    <CardContent className="p-6 text-center">
                                        <div className="w-16 h-16 gradient-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Icon className="h-8 w-8 text-secondary-foreground" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-primary mb-3">
                                            {feature.title}
                                        </h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-primary">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-primary-foreground mb-4">
                        Ready to Start Investing?
                    </h2>
                    <p className="text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                        Join thousands of investors already building wealth through fractional real estate ownership.
                    </p>
                    <Button 
                        variant="hero" 
                        size="lg"
                        onClick={handleStartInvesting} // Call the new handler
                        className="bg-accent text-accent-foreground hover:bg-accent-light"
                    >
                        Get Started Today
                    </Button>
                </div>
            </section>
        </div>
    );
};

export default Home;