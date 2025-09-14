import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, FileText, Calculator, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Plane className="text-white text-2xl" size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark mb-4">
            PDSN - Expense Manager
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Professional Travel Expense Management. Track your business travel
            expenses with ease, create vouchers, and manage your department's
            travel budget efficiently.
          </p>
          <Button
            onClick={handleLogin}
            size="lg"
            className="bg-primary hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="text-primary" size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Voucher Management</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create master vouchers for projects and trips with defined date
                ranges and department organization.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                <Calculator className="text-secondary" size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Automatic Calculations
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Automatic fuel cost calculation at ₹3.5 per kilometer and
                real-time running totals for all expenses.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="text-accent" size={24} />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Secure & Mobile-First
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Secure authentication with department-based access and optimized
                mobile interface for on-the-go expense tracking.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">For Employees</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Create and manage travel vouchers</li>
                <li>• Add expenses with transport type selection</li>
                <li>• Automatic fuel cost calculations</li>
                <li>• Real-time expense tracking</li>
                <li>• Mobile-optimized interface</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">For Organizations</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Department-based organization</li>
                <li>• Draft and submitted status tracking</li>
                <li>• Comprehensive expense reports</li>
                <li>• Secure authentication system</li>
                <li>• Professional expense management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
