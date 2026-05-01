import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quotation from '@/lib/models/Quotation';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_this_later');

export const dynamic = 'force-dynamic';

async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      name: payload.name as string,
      role: (payload.role as string) || 'cashier',
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const quotations = await Quotation.find(query).sort({ createdAt: -1 }).limit(limit);
    return Response.json(quotations);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch quotations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();

    // Generate quotation number
    const count = await Quotation.countDocuments();
    const prefix = body.quotationType === 'wholesale' ? 'QWS' : 'QRT';
    const quotationNo = `${prefix}-${String(count + 1).padStart(5, '0')}`;

    const quotation = await Quotation.create({
      ...body,
      quotationNo,
      createdBy: user.name,
    });

    return Response.json(quotation, { status: 201 });
  } catch (error) {
    return Response.json({ error: 'Failed to create quotation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { _id, ...data } = body;

    const quotation = await Quotation.findByIdAndUpdate(_id, data, { new: true });
    return Response.json(quotation);
  } catch (error) {
    return Response.json({ error: 'Failed to update quotation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Quotation ID required' }, { status: 400 });
    }

    await Quotation.findByIdAndDelete(id);
    return Response.json({ message: 'Quotation deleted' });
  } catch (error) {
    return Response.json({ error: 'Failed to delete quotation' }, { status: 500 });
  }
}
