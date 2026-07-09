import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cloudadditive.com' },
        update: {},
        create: {
            email: 'admin@cloudadditive.com',
            name: 'Admin',
            passwordHash: adminPassword,
            role: 'ADMIN',
            emailVerified: new Date(),
        },
    })
    console.log('✅ Created admin user:', admin.email)

    // Create provider user
    const providerPassword = await bcrypt.hash('provider123', 10)
    const providerUser = await prisma.user.upsert({
        where: { email: 'workshop@uii.ac.id' },
        update: {},
        create: {
            email: 'workshop@uii.ac.id',
            name: 'UII Workshop',
            passwordHash: providerPassword,
            role: 'PROVIDER',
            emailVerified: new Date(),
        },
    })

    // Create provider profile
    const provider = await prisma.provider.upsert({
        where: { userId: providerUser.id },
        update: {},
        create: {
            userId: providerUser.id,
            businessName: 'UII 3D Print Workshop',
            description: 'Layanan 3D printing berkualitas di kampus UII',
            city: 'Sleman',
            province: 'DI Yogyakarta',
            latitude: -7.7586,
            longitude: 110.4096,
            isVerified: true,
        },
    })
    console.log('✅ Created provider:', provider.businessName)

    // Create materials
    const materials = [
        { name: 'PLA', pricePerGram: 0.5, density: 1.24, nozzleTemp: 200, bedTemp: 60, description: 'Material biodegradable, mudah dicetak' },
        { name: 'ABS', pricePerGram: 0.6, density: 1.04, nozzleTemp: 230, bedTemp: 100, description: 'Kuat dan tahan panas' },
        { name: 'PETG', pricePerGram: 0.7, density: 1.27, nozzleTemp: 235, bedTemp: 80, description: 'Kombinasi kekuatan dan fleksibilitas' },
        { name: 'TPU', pricePerGram: 1.0, density: 1.21, nozzleTemp: 220, bedTemp: 50, description: 'Fleksibel seperti karet' },
    ]

    for (const mat of materials) {
        const material = await prisma.material.upsert({
            where: { id: mat.name.toLowerCase() },
            update: {},
            create: {
                id: mat.name.toLowerCase(),
                name: mat.name,
                type: 'Filament',
                description: mat.description,
                density: mat.density,
                diameter: 1.75,
                pricePerGram: mat.pricePerGram,
                nozzleTemp: mat.nozzleTemp,
                bedTemp: mat.bedTemp,
                colors: {
                    create: [
                        { name: 'White', hexCode: '#FFFFFF' },
                        { name: 'Black', hexCode: '#000000' },
                        { name: 'Red', hexCode: '#EF4444' },
                        { name: 'Blue', hexCode: '#3B82F6' },
                        { name: 'Green', hexCode: '#22C55E' },
                    ],
                },
            },
        })
        console.log('✅ Created material:', material.name)
    }

    // Create print quality presets
    const qualities = [
        { id: 'draft', name: 'Draft', layerHeight: 0.3, speedMultiplier: 1.5, priceMultiplier: 0.8, description: 'Cepat, untuk prototype', sortOrder: 1 },
        { id: 'normal', name: 'Normal', layerHeight: 0.2, speedMultiplier: 1.0, priceMultiplier: 1.0, description: 'Seimbang', sortOrder: 2 },
        { id: 'fine', name: 'Fine', layerHeight: 0.1, speedMultiplier: 0.6, priceMultiplier: 1.3, description: 'Detail tinggi', sortOrder: 3 },
    ]

    for (const q of qualities) {
        const quality = await prisma.printQuality.upsert({
            where: { id: q.id },
            update: {},
            create: q,
        })
        console.log('✅ Created quality preset:', quality.name)
    }

    await prisma.systemSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            markupPercentage: 0.15,
            platformFeePercentage: 0.10,
            machineRatePerHour: 10000,
            estimatedPrintSpeed: 15000,
            defaultInfillPercentage: 0.20,
        },
    })
    console.log('✅ Created system settings')

    // Create a sample printer
    const printer = await prisma.printer.upsert({
        where: { id: 'printer-1' },
        update: {
            currentMaterialId: 'pla',
            isAcceptingOrders: true,
            status: 'ONLINE',
        },
        create: {
            id: 'printer-1',
            providerId: provider.id,
            name: 'Prusa MK3S+ #1',
            model: 'Prusa MK3S+',
            technology: 'FDM',
            buildWidth: 250,
            buildDepth: 210,
            buildHeight: 210,
            status: 'ONLINE',
            currentMaterialId: 'pla',
            isAcceptingOrders: true,
        },
    })

    // Link printer to materials
    for (const mat of materials) {
        const material = await prisma.material.findUnique({ where: { id: mat.name.toLowerCase() } })
        if (!material) continue

        await prisma.printerMaterial.upsert({
            where: { printerId_materialId: { printerId: printer.id, materialId: material.id } },
            update: {},
            create: {
                printerId: printer.id,
                materialId: material.id,
                nozzleTemp: mat.nozzleTemp,
                bedTemp: mat.bedTemp,
            },
        })
    }
    console.log('✅ Created printer:', printer.name)

    // Create customer user
    const customerPassword = await bcrypt.hash('customer123', 10)
    const customer = await prisma.user.upsert({
        where: { email: 'customer@example.com' },
        update: {},
        create: {
            email: 'customer@example.com',
            name: 'Test Customer',
            passwordHash: customerPassword,
            role: 'CUSTOMER',
            emailVerified: new Date(),
        },
    })
    console.log('✅ Created customer:', customer.email)

    console.log('🎉 Seeding completed!')
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
