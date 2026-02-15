import { LucideLayoutDashboard, LucideWallet, LucideArrowRightLeft, LucideSettings, LucideLogOut, LucideUsers } from 'lucide-react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            navigate('/login');
        } else {
            setUser(JSON.parse(userStr));
        }
    }, [navigate]);



    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user) return null; // Or loading spinner

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LucideLayoutDashboard },
        { name: 'Payouts', href: '/dashboard/payouts', icon: LucideWallet },
        { name: 'Beneficiaries', href: '/dashboard/beneficiaries', icon: LucideUsers },
        { name: 'Transactions', href: '/dashboard/transactions', icon: LucideArrowRightLeft },
        { name: 'Reconciliation', href: '/dashboard/reconciliation', icon: LucideArrowRightLeft },
        { name: 'Settings', href: '/dashboard/settings', icon: LucideSettings },
    ];

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-2xl font-bold text-blue-600">bepay</h1>
                    <p className="text-xs text-gray-500">Unified Payment Infrastructure</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center mb-4">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {user.name.charAt(0)}
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-700">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate w-32">{user.email}</p>
                        </div>
                    </div>
                    <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                        <LucideLogOut className="mr-3 h-5 w-5" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="bg-white border-b border-gray-200 p-4 md:hidden flex items-center justify-between">
                    <h1 className="text-xl font-bold text-blue-600">bepay</h1>
                    {/* Mobile menu button would go here */}
                </header>
                <div className="flex-1 p-8 overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
