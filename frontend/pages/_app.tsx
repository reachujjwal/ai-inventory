import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { LoadingProvider } from '../context/LoadingContext';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';

import { ThemeProvider } from '../context/ThemeContext';

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider>
            <LoadingProvider>
                <NotificationProvider>
                    <AuthProvider>
                        <CartProvider>
                            <WishlistProvider>
                                <Component {...pageProps} />
                            </WishlistProvider>
                        </CartProvider>
                    </AuthProvider>
                </NotificationProvider>
            </LoadingProvider>
        </ThemeProvider>
    );
}

export default MyApp
