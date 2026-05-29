import fs from 'fs';
import path from 'path';

interface Invoice {
    id: string;
    timestamp: Date;
    tradeId: string;
    symbol: string;
    realizedProfit: number;
    feePercentage: number;
    feeAmountUsdt: number;
    status: 'unpaid' | 'paid';
}

const INVOICE_FILE = path.join(process.cwd(), 'billing_invoices.json');

export class BillingEngine {
    private invoices: Invoice[] = [];

    constructor() {
        this.loadInvoices();
    }

    private loadInvoices() {
        try {
            if (fs.existsSync(INVOICE_FILE)) {
                this.invoices = JSON.parse(fs.readFileSync(INVOICE_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error("Failed to load invoices", e);
        }
    }

    private saveInvoices() {
        try {
            fs.writeFileSync(INVOICE_FILE, JSON.stringify(this.invoices, null, 2));
        } catch (e) {
            console.error("Failed to save invoices", e);
        }
    }

    public chargePerformanceFee(tradeId: string, symbol: string, realizedProfit: number, feePercentage: number = 2.0) {
        if (realizedProfit <= 0) return; // Only charge on profit
        
        const feeAmountUsdt = (feePercentage / 100) * realizedProfit;
        
        const invoice: Invoice = {
            id: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date(),
            tradeId,
            symbol,
            realizedProfit,
            feePercentage,
            feeAmountUsdt,
            status: 'unpaid'
        };

        this.invoices.push(invoice);
        this.saveInvoices();
        
        // Audit log the billing event
        const logLine = `[${new Date().toISOString()}] [BILLING_HOOK] Invoiced ${feeAmountUsdt.toFixed(4)} USDT for ${symbol} Trade ${tradeId} (${feePercentage}% of ${realizedProfit.toFixed(4)} USDT profit)\n`;
        try {
            fs.appendFileSync(path.join(process.cwd(), 'real_audit.log'), logLine);
            console.log(logLine.trim());
        } catch(e) {}

        return invoice;
    }

    public getPendingInvoices() {
        return this.invoices.filter(i => i.status === 'unpaid');
    }
}

export const billingEngine = new BillingEngine();
