/**
 * Manual Order Assignment Script
 * Run with: npx tsx scripts/assign-order.ts <orderId>
 * 
 * This script manually triggers the order assignment process
 * for orders that were manually set to CONFIRMED in the database.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const orderId = process.argv[2]

    if (!orderId) {
        // List all confirmed orders without provider
        console.log('\n📋 Unassigned CONFIRMED orders:\n')

        const unassignedOrders = await prisma.order.findMany({
            where: {
                status: 'CONFIRMED',
                providerId: null,
            },
            select: {
                id: true,
                orderNumber: true,
                stlFileName: true,
                materialId: true,
                material: { select: { name: true } },
                createdAt: true,
            }
        })

        if (unassignedOrders.length === 0) {
            console.log('✅ No unassigned CONFIRMED orders found.')
        } else {
            for (const order of unassignedOrders) {
                console.log(`• ${order.orderNumber}`)
                console.log(`  ID: ${order.id}`)
                console.log(`  File: ${order.stlFileName}`)
                console.log(`  Material: ${order.material?.name || 'Unknown'} (${order.materialId})`)
                console.log(`  Created: ${order.createdAt.toLocaleString()}`)
                console.log('')
            }
            console.log('Run: npx tsx scripts/assign-order.ts <orderId>')
        }

        // Also show available printers
        console.log('\n🖨️ Available Printers:\n')
        const printers = await prisma.printer.findMany({
            select: {
                id: true,
                name: true,
                status: true,
                isAcceptingOrders: true,
                currentMaterialId: true,
                materials: {
                    select: {
                        material: { select: { id: true, name: true } }
                    }
                },
                provider: {
                    select: { businessName: true }
                }
            }
        })

        for (const printer of printers) {
            const materials = printer.materials.map(m => m.material.name).join(', ')
            console.log(`• ${printer.name} (${printer.provider?.businessName})`)
            console.log(`  ID: ${printer.id}`)
            console.log(`  Status: ${printer.status} | Accepting: ${printer.isAcceptingOrders}`)
            console.log(`  Materials: ${materials || 'None configured'}`)
            console.log('')
        }

        return
    }

    // Find order
    console.log(`\n🔍 Looking for order: ${orderId}\n`)

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            material: true,
            provider: true,
            printer: true,
        }
    })

    if (!order) {
        console.error('❌ Order not found!')
        return
    }

    console.log(`📦 Order Details:`)
    console.log(`   Number: ${order.orderNumber}`)
    console.log(`   Status: ${order.status}`)
    console.log(`   Material: ${order.material?.name} (${order.materialId})`)
    console.log(`   Provider: ${order.provider?.businessName || 'Not assigned'}`)
    console.log(`   Printer: ${order.printer?.name || 'Not assigned'}`)
    console.log('')

    // Find compatible printers
    console.log('🔎 Finding compatible printers...\n')

    const compatiblePrinters = await prisma.printer.findMany({
        where: {
            materials: {
                some: { materialId: order.materialId }
            },
        },
        select: {
            id: true,
            providerId: true,
            name: true,
            status: true,
            isAcceptingOrders: true,
            currentMaterialId: true,
            provider: {
                select: { businessName: true, city: true }
            }
        }
    })

    if (compatiblePrinters.length === 0) {
        console.log('❌ No compatible printers found!')
        console.log(`   Order requires material: ${order.material?.name}`)
        console.log('')
        console.log('📝 To fix this:')
        console.log('   1. Go to provider dashboard')
        console.log('   2. Edit a printer and add the required material')
        console.log('   3. Re-run this script')
        return
    }

    console.log(`✅ Found ${compatiblePrinters.length} compatible printer(s):\n`)
    for (const printer of compatiblePrinters) {
        console.log(`   • ${printer.name} (${printer.provider?.businessName})`)
        console.log(`     Status: ${printer.status} | Accepting: ${printer.isAcceptingOrders}`)
        console.log(`     City: ${printer.provider?.city}`)
    }
    console.log('')

    // Pick the first available printer
    const selectedPrinter = compatiblePrinters.find(p => p.isAcceptingOrders) || compatiblePrinters[0]

    console.log(`📍 Assigning to: ${selectedPrinter.name}\n`)

    // Update order
    await prisma.order.update({
        where: { id: orderId },
        data: {
            providerId: selectedPrinter.providerId,
            printerId: selectedPrinter.id,
            status: 'IN_QUEUE',
        }
    })

    // Add status history
    await prisma.orderStatusHistory.create({
        data: {
            orderId,
            status: 'IN_QUEUE',
            note: `Manually assigned to ${selectedPrinter.name}`,
            changedBy: 'SYSTEM',
        }
    })

    console.log('✅ Order assigned successfully!')
    console.log(`   Provider: ${selectedPrinter.provider?.businessName}`)
    console.log(`   Printer: ${selectedPrinter.name}`)
    console.log(`   Status: IN_QUEUE`)
    console.log('')
    console.log('🔄 Refresh the provider dashboard to see the order.')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
