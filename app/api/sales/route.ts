import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Sale from '@/lib/models/Sale';
import Product from '@/lib/models/Product';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const query: Record<string, unknown> = {};
    if (type) query.saleType = type;
    if (from || to) {
      query.date = {};
      if (from) (query.date as Record<string, unknown>).$gte = new Date(from);
      if (to) (query.date as Record<string, unknown>).$lte = new Date(to + 'T23:59:59');
    }

    const sales = await Sale.find(query).sort({ date: -1 }).limit(limit);
    return Response.json(sales);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    // Generate invoice number
    const count = await Sale.countDocuments();
    const prefix = body.saleType === 'wholesale' ? 'WS' : 'RT';
    const invoiceNo = `${prefix}-${String(count + 1).padStart(5, '0')}`;

    const sale = await Sale.create({ ...body, invoiceNo });

    // Update stock for each item
    for (const item of body.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.qty },
      });
    }

    return Response.json(sale, { status: 201 });
  } catch (error) {
    return Response.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}
