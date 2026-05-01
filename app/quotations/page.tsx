'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/lib/types';
import { generateQuotation } from '@/lib/pdf';

interface QuotationItem {
  product: string;
  productName: string;
  qty: number;
  unitPrice: number;
  unit: string;
  total: number;
}

interface Quotation {
  _id?: string;
  quotationNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
  validUntil: string;
  quotationType: 'retail' | 'wholesale';
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdAt?: string;
}

function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function QuotationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('view');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'accepted' | 'rejected'>('all');

  const [formData, setFormData] = useState<Quotation>({
    quotationNo: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    notes: '',
    validUntil: '',
    quotationType: 'retail',
    status: 'draft',
  });

  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedQty, setSelectedQty] = useState('1');

  // Fetch products and quotations
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, quotationsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/quotations'),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(Array.isArray(data) ? data : []);
        }

        if (quotationsRes.ok) {
          const data = await quotationsRes.json();
          setQuotations(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addItemToQuotation = () => {
    if (!selectedProduct) return;

    const product = products.find((p) => p._id === selectedProduct);
    if (!product) return;

    const qty = parseInt(selectedQty) || 1;
    const price = formData.quotationType === 'retail' 
      ? (product.retailPrice ?? product.sellingPrice ?? 0)
      : (product.wholesalePrice ?? product.sellingPrice ?? 0);

    const newItem: QuotationItem = {
      product: product._id || '',
      productName: product.name,
      qty,
      unitPrice: price,
      unit: product.unit,
      total: price * qty,
    };

    const updatedItems = [...formData.items, newItem];
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - (formData.discount || 0);

    setFormData({
      ...formData,
      items: updatedItems,
      subtotal,
      total,
    });

    setSelectedProduct('');
    setSelectedQty('1');
  };

  const removeItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - (formData.discount || 0);

    setFormData({
      ...formData,
      items: updatedItems,
      subtotal,
      total,
    });
  };

  const updateDiscount = (newDiscount: number) => {
    const total = formData.subtotal - newDiscount;
    setFormData({ ...formData, discount: newDiscount, total });
  };

  const handleSaveQuotation = async () => {
    if (!formData.customerName || formData.items.length === 0) {
      alert('Please fill in customer name and add items');
      return;
    }

    try {
      const res = await fetch('/api/quotations', {
        method: formData._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        alert('Quotation saved successfully');
        
        // Reset form
        setFormData({
          quotationNo: '',
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          customerAddress: '',
          items: [],
          subtotal: 0,
          discount: 0,
          total: 0,
          notes: '',
          validUntil: '',
          quotationType: 'retail',
          status: 'draft',
        });
        setShowForm(false);
        
        // Refresh quotations
        const quotationsRes = await fetch('/api/quotations');
        if (quotationsRes.ok) {
          const quotationsData = await quotationsRes.json();
          setQuotations(Array.isArray(quotationsData) ? quotationsData : []);
        }
      }
    } catch (error) {
      alert('Failed to save quotation');
      console.error(error);
    }
  };

  const handleGeneratePDF = async (quotation: Quotation) => {
    await generateQuotation(quotation);
  };

  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.customerName.toLowerCase().includes(search.toLowerCase()) ||
      q.quotationNo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-2">Quotations</h1>
          <p className="text-gray-600">Create and manage quotations for your customers</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'view'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'
            }`}
          >
            View Quotations
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'
            }`}
          >
            Create Quotation
          </button>
        </div>

        {/* View Quotations Tab */}
        {activeTab === 'view' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <input
                type="text"
                placeholder="Search by customer name or quotation number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Quotations List */}
            <div className="space-y-3">
              {filteredQuotations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-500">No quotations found</p>
                </div>
              ) : (
                filteredQuotations.map((quotation) => (
                  <div
                    key={quotation._id}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Quotation #</p>
                        <p className="font-semibold text-green-700">{quotation.quotationNo}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Customer</p>
                        <p className="font-medium">{quotation.customerName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="font-semibold text-lg">{formatLKR(quotation.total)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            quotation.status === 'draft'
                              ? 'bg-gray-100 text-gray-700'
                              : quotation.status === 'sent'
                              ? 'bg-blue-100 text-blue-700'
                              : quotation.status === 'accepted'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {quotation.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGeneratePDF(quotation)}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition text-sm font-medium"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                    {quotation.customerPhone && (
                      <p className="text-sm text-gray-600">📱 {quotation.customerPhone}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Create Quotation Tab */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Customer Information</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Quotation Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Quotation Settings</h3>
                <div className="space-y-3">
                  <select
                    value={formData.quotationType}
                    onChange={(e) => setFormData({ ...formData, quotationType: e.target.value as 'retail' | 'wholesale' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Add Products */}
            <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Add Products</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Quantity"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(e.target.value)}
                  min="1"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={addItemToQuotation}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Add Item
                </button>
              </div>
            </div>

            {/* Items Table */}
            {formData.items.length > 0 && (
              <div className="mb-8 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-green-600 text-white">
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-center">Qty</th>
                      <th className="px-4 py-2 text-center">Unit</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-green-50">
                        <td className="px-4 py-2">{item.productName}</td>
                        <td className="px-4 py-2 text-center">{item.qty}</td>
                        <td className="px-4 py-2 text-center">{item.unit}</td>
                        <td className="px-4 py-2 text-right">{formatLKR(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatLKR(item.total)}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-2xl font-bold text-gray-800">{formatLKR(formData.subtotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Discount</p>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => updateDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1 border border-gray-300 rounded"
                    min="0"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-green-600">{formatLKR(formData.total)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes/Terms</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes or terms..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSaveQuotation}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold text-lg"
              >
                Save & Generate PDF
              </button>
              <button
                onClick={() => setActiveTab('view')}
                className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
