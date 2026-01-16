declare module 'midtrans-client' {
    export interface SnapConfig {
        isProduction: boolean
        serverKey: string
        clientKey: string
    }

    export interface TransactionParameter {
        transaction_details: {
            order_id: string
            gross_amount: number
        }
        customer_details?: {
            first_name?: string
            last_name?: string
            email?: string
            phone?: string
        }
        item_details?: Array<{
            id: string
            name: string
            price: number
            quantity: number
        }>
        callbacks?: {
            finish?: string
        }
    }

    export interface SnapTransaction {
        token: string
        redirect_url: string
    }

    export interface TransactionStatus {
        transaction_status: string
        fraud_status?: string
        payment_type?: string
        order_id: string
        gross_amount: string
    }

    export class Snap {
        constructor(config: SnapConfig)
        createTransaction(parameter: TransactionParameter): Promise<SnapTransaction>
    }

    export class CoreApi {
        constructor(config: SnapConfig)
        transaction: {
            status(orderId: string): Promise<TransactionStatus>
        }
    }
}
