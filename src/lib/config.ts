// API configuration constants
export const API_CONFIG = {
    biteship: {
        baseUrl: 'https://api.biteship.com',
        apiKey: process.env.BITESHIP_API_KEY || '',
    },
    midtrans: {
        serverKey: process.env.MIDTRANS_SERVER_KEY || '',
        clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        snapUrl: process.env.MIDTRANS_IS_PRODUCTION === 'true'
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js',
        apiUrl: process.env.MIDTRANS_IS_PRODUCTION === 'true'
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com',
    },
    googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    },
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
        allowedExtensions: ['.stl', '.obj', '.3mf'],
        uploadDir: process.env.UPLOAD_DIR || './uploads',
    },
}

// App constants
export const APP_CONFIG = {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'CloudAdditive',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}

// Order status labels and colors
export const ORDER_STATUS_CONFIG = {
    PENDING_PAYMENT: { label: 'Menunggu Pembayaran', color: 'yellow', icon: 'clock' },
    PAYMENT_FAILED: { label: 'Pembayaran Gagal', color: 'red', icon: 'x-circle' },
    CONFIRMED: { label: 'Dikonfirmasi', color: 'blue', icon: 'check-circle' },
    IN_QUEUE: { label: 'Dalam Antrian', color: 'blue', icon: 'queue-list' },
    SLICING: { label: 'Proses Slicing', color: 'purple', icon: 'cog' },
    PRINTING: { label: 'Sedang Dicetak', color: 'orange', icon: 'printer' },
    POST_PROCESSING: { label: 'Finishing', color: 'indigo', icon: 'scissors' },
    PACKING: { label: 'Dikemas', color: 'teal', icon: 'archive-box' },
    SHIPPED: { label: 'Dikirim', color: 'cyan', icon: 'truck' },
    DELIVERED: { label: 'Terkirim', color: 'green', icon: 'check-badge' },
    COMPLETED: { label: 'Selesai', color: 'green', icon: 'shield-check' },
    CANCELLED: { label: 'Dibatalkan', color: 'gray', icon: 'x-circle' },
    REFUNDED: { label: 'Dikembalikan', color: 'gray', icon: 'arrow-uturn-left' },
} as const

// Print quality presets
export const PRINT_QUALITY_PRESETS = [
    { name: 'Draft', layerHeight: 0.3, speedMultiplier: 1.5, priceMultiplier: 0.8, description: 'Cepat, untuk prototype' },
    { name: 'Normal', layerHeight: 0.2, speedMultiplier: 1.0, priceMultiplier: 1.0, description: 'Seimbang antara kualitas dan waktu' },
    { name: 'Fine', layerHeight: 0.1, speedMultiplier: 0.6, priceMultiplier: 1.3, description: 'Detail tinggi, permukaan halus' },
]
