import Layout from '../../components/Layout';
import Link from 'next/link';

export default function PaymentCancel() {
    return (
        <Layout title="Payment Cancelled">
            <div className="max-w-2xl mx-auto py-20 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                </div>
                <h1 className="text-4xl font-black text-text uppercase tracking-tighter mb-4">Payment Cancelled</h1>
                <p className="text-lg text-text-secondary mb-8 font-medium">No worries! Your cart items are still safe. You can go back and complete your purchase whenever you're ready.</p>
                <div className="flex justify-center gap-4">
                    <Link href="/cart">
                        <a className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg transition-all">Return to Cart</a>
                    </Link>
                    <Link href="/products">
                        <a className="px-8 py-3 border border-border text-text font-bold rounded-xl hover:bg-surface transition-all">Browse Products</a>
                    </Link>
                </div>
            </div>
        </Layout>
    );
}
