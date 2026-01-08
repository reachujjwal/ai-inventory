import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { canAccess, PERMISSIONS } from '../lib/rbac';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
    children: ReactNode;
    title: string;
}

export default function Layout({ children, title }: LayoutProps) {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { itemCount } = useCart();
    const { wishlistCount } = useWishlist();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen flex flex-col bg-background text-text font-sans relative selection:bg-primary/30 selection:text-primary-hover">
            {/* Background Gradient Mesh & Texture */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* SVG Grid Pattern */}
                <div className="absolute inset-0 z-[1] opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                {/* Deep Space Blobs (Simpler, Monochromatic) */}
                <div className="absolute top-0 left-[-20%] w-[70vh] h-[70vh] rounded-full bg-primary/10 blur-[120px] mix-blend-screen animate-blob"></div>
                <div className="absolute top-[20%] right-[-20%] w-[70vh] h-[70vh] rounded-full bg-primary/5 blur-[120px] mix-blend-screen animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[70vh] h-[70vh] rounded-full bg-slate-500/5 blur-[120px] mix-blend-screen animate-blob animation-delay-4000"></div>
            </div>

            <nav className="sticky top-0 z-50 border-b border-border/50 bg-surface/80 backdrop-blur-md shadow-sm transition-all duration-300">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/">
                            <a className="text-xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                                Inventory AI
                            </a>
                        </Link>

                        <div className="hidden md:flex space-x-6">
                            <Link href="/">
                                <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname === '/' ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                    Dashboard
                                </a>
                            </Link>

                            {canAccess(user?.role, PERMISSIONS.MODULE_USERS, user?.permissions) && (
                                <Link href="/users">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname === '/users' ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Users
                                    </a>
                                </Link>
                            )}

                            {user && (
                                <Link href="/products">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname === '/products' ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Products
                                    </a>
                                </Link>
                            )}

                            {canAccess(user?.role, PERMISSIONS.MODULE_INVENTORY, user?.permissions) && (
                                <Link href="/inventory">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname === '/inventory' ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Inventory
                                    </a>
                                </Link>
                            )}

                            {user && (
                                <Link href="/categories">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname === '/categories' ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Categories
                                    </a>
                                </Link>
                            )}

                            {canAccess(user?.role, PERMISSIONS.MODULE_SALES, user?.permissions) && (
                                <Link href="/sales">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname.startsWith('/sales') ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Sales
                                    </a>
                                </Link>
                            )}

                            {canAccess(user?.role, PERMISSIONS.MODULE_ORDERS, user?.permissions) && (
                                <Link href="/orders">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname.startsWith('/orders') ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Orders
                                    </a>
                                </Link>
                            )}

                            {canAccess(user?.role, PERMISSIONS.MODULE_PERMISSIONS, user?.permissions) && (
                                <Link href="/settings/permissions">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname === '/settings/permissions' ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Permissions
                                    </a>
                                </Link>
                            )}

                            {canAccess(user?.role, PERMISSIONS.MODULE_COUPONS, user?.permissions) && (
                                <Link href="/coupons">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname === '/coupons' ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Coupons
                                    </a>
                                </Link>
                            )}

                            {canAccess(user?.role, PERMISSIONS.MODULE_REWARDS, user?.permissions) && user?.role !== 'user' && (
                                <Link href="/admin/reward-points">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname === '/admin/reward-points' ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Reward Points
                                    </a>
                                </Link>
                            )}

                            {user?.role === 'user' && (
                                <Link href="/rewards">
                                    <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${router.pathname === '/rewards' ? 'bg-primary/20 text-primary' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}>
                                        Rewards
                                    </a>
                                </Link>
                            )}
                        </div>

                        <div className="flex items-center space-x-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-text-secondary hover:text-primary transition-colors focus:outline-none"
                                aria-label="Toggle Theme"
                            >
                                {theme === 'dark' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                                )}
                            </button>

                            {user && (
                                <Link href="/wishlist">
                                    <a className="relative p-2 text-text-secondary hover:text-primary transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                        </svg>
                                        {wishlistCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                {wishlistCount}
                                            </span>
                                        )}
                                    </a>
                                </Link>
                            )}

                            {user && (
                                <Link href="/cart">
                                    <a className="relative p-2 text-text-secondary hover:text-primary transition-colors mr-4">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                        {itemCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                {itemCount}
                                            </span>
                                        )}
                                    </a>
                                </Link>
                            )}

                            {user ? (
                                <div className="relative group">
                                    <button className="flex items-center space-x-2 text-sm font-medium text-text hover:text-primary transition-colors focus:outline-none">
                                        <div className="flex flex-col items-end mr-2">
                                            <span className="leading-tight">{user.username}</span>
                                        </div>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </button>
                                    <div className="absolute right-0 w-48 mt-2 origin-top-right bg-surface border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                                        <Link href="/activity-logs">
                                            <a className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text transition-colors border-b border-border/50">
                                                Activity Logs
                                            </a>
                                        </Link>
                                        <Link href="/settings/profile">
                                            <a className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text transition-colors">
                                                My Profile
                                            </a>
                                        </Link>
                                        <button
                                            onClick={logout}
                                            className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text transition-colors border-t border-border/50"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <Link href="/login">
                                    <a className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors">
                                        Login
                                    </a>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-grow container mx-auto px-4 py-8 relative z-10 animate-fade-in">
                {children}
            </main>

            <footer className="border-t border-border/50 bg-surface/50 backdrop-blur-sm mt-auto relative z-10">
                <div className="container mx-auto px-4 py-6 text-center text-text-secondary text-sm">
                    <p>&copy; {new Date().getFullYear()} Inventory AI. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
