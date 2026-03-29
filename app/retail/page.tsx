'use client';

import { useEffect, useState } from 'react';
import { Product, CartItem } from '@/lib/types';
import { generateReceipt } from '@/lib/pdf';

function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getRetailPrice(product: Product) {
  return product.retailPrice ?? product.sellingPrice ?? 0;
}

export default function RetailPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [discount, setDiscount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error(e);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    const existing = cart.find((c) => c.product._id === product._id);
    if (existing) {
      if (existing.qty >= product.stock) return;
      setCart(cart.map((c) =>
        c.product._id === product._id ? { ...c, qty: c.qty + 1 } : c
      ));
    } else {
      setCart([...cart, { product, qty: 1, discount: 0 }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.product._id === productId) {
        const newQty = c.qty + delta;
        if (newQty <= 0) return c;
        if (newQty > c.product.stock) return c;
        return { ...c, qty: newQty };
      }
      return c;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.product._id !== productId));
  };

  const subtotal = cart.reduce((sum, c) => sum + getRetailPrice(c.product) * c.qty, 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = subtotal - discountAmount;
  const totalCost = cart.reduce((sum, c) => sum + c.product.costPrice * c.qty, 0);
  const profit = total - totalCost;
  const whatsappPhonePattern = /^\+94\s\d{2}\s\d{3}\s\d{4}$/;

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (sendWhatsApp) {
      if (!customerPhone.trim()) {
        alert('Please enter customer WhatsApp number. Format: +94 76 180 9833');
        return;
      }

      if (!whatsappPhonePattern.test(customerPhone.trim())) {
        alert('Invalid number format. Please use: +94 76 180 9833');
        return;
      }
    }

    setProcessing(true);

    const saleData = {
      customerName: customerName || 'Walk-in Customer',
      items: cart.map((c) => ({
        product: c.product._id,
        productName: c.product.name,
        qty: c.qty,
        unitPrice: getRetailPrice(c.product),
        costPrice: c.product.costPrice,
        total: getRetailPrice(c.product) * c.qty,
      })),
      subtotal,
      discount: discountAmount,
      total,
      profit,
      paymentMethod,
      saleType: 'retail' as const,
      date: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      if (res.ok) {
        const sale = await res.json();
        generateReceipt(sale);
        
        if (sendWhatsApp) {
          const text = [
            `Govi Sewana Receipt`,
            `Invoice: ${sale.invoiceNo}`,
            `Customer: ${sale.customerName || 'Walk-in Customer'}`,
            `Total: ${formatLKR(sale.total)}`,
            `Payment: ${sale.paymentMethod}`,
            `Date: ${new Date(sale.date).toLocaleString('en-LK')}`,
            `Thank you for your purchase!`,
          ].join('\n');

          try {
            const waRes = await fetch('/api/whatsapp/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: customerPhone.trim(), text }),
            });

            if (waRes.ok) {
              alert('Sale completed. WhatsApp message sent successfully.');
            } else {
              const waData = await waRes.json().catch(() => ({ error: 'Failed to send WhatsApp' }));
              alert(`Sale completed. WhatsApp failed: ${waData.error || 'Unknown error'}. Please ensure the phone number is correct with country code (+94).`);
            }
          } catch (error) {
            console.error('WhatsApp send error:', error);
            alert('Sale completed. WhatsApp could not be sent due to a network error.');
          }
        } else {
          alert('Sale completed.');
        }


        // Reset
        setCart([]);
        setDiscount('');
        setCustomerName('');
        setCustomerPhone('');
        setSendWhatsApp(false);
        setPaymentMethod('cash');

        // Refresh products
        const updatedProducts = await fetch('/api/products').then((r) => r.json());
        setProducts(updatedProducts);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Sale failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>🛒 Retail Sales</h1>
        <p>Create retail sales and generate receipts</p>
      </div>

      <div className="pos-layout">
        {/* Products Grid */}
        <div>
          <div className="search-bar" style={{ marginBottom: '16px', maxWidth: '100%' }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="pos-products">
            {filteredProducts.map((p) => (
              <div
                key={p._id}
                className="product-card"
                onClick={() => addToCart(p)}
                style={{ opacity: p.stock <= 0 ? 0.5 : 1 }}
              >
                <div className="product-name">{p.name}</div>
                <div className="product-price">{formatLKR(getRetailPrice(p))}</div>
                <div className={`product-stock ${p.stock <= 0 ? 'out-of-stock' : ''}`}>
                  {p.stock <= 0 ? 'Out of Stock' : `${p.stock} ${p.unit} available`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="cart-panel">
          <div className="cart-header">
            <h3>🧾 Shopping Cart</h3>
            {cart.length > 0 && (
              <span className="badge badge-success">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="cart-empty">
              <span>🛒</span>
              Click products to add to cart
            </div>
          ) : (
            <>
              {/* Customer Name */}
              <div className="checkout-section">
                <label>Customer Name (optional)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ marginTop: '6px' }}
                />
              </div>

              <div className="checkout-section">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={sendWhatsApp}
                    onChange={(e) => setSendWhatsApp(e.target.checked)}
                  />
                  Do you want to send WhatsApp receipt to customer?
                </label>
                {sendWhatsApp && (
                  <input
                    className="form-input"
                    type="text"
                    placeholder="+94 76 180 9833"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ marginTop: '10px' }}
                  />
                )}
              </div>

              <div className="cart-items">
                {cart.map((item) => (
                  <div key={item.product._id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.product.name}</div>
                      <div className="cart-item-price">
                        {formatLKR(getRetailPrice(item.product))} × {item.qty}
                      </div>
                    </div>
                    <div className="cart-item-controls">
                      <button className="qty-btn" onClick={() => updateQty(item.product._id!, -1)}>−</button>
                      <span className="qty-value">{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.product._id!, 1)}>+</button>
                    </div>
                    <div className="cart-item-total">
                      {formatLKR(getRetailPrice(item.product) * item.qty)}
                    </div>
                    <button className="cart-remove" onClick={() => removeFromCart(item.product._id!)}>✕</button>
                  </div>
                ))}
              </div>

              {/* Customer Name */}
              <div className="checkout-section">
                <label>Customer Name (optional)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ marginTop: '6px' }}
                />
              </div>

              {/* Discount */}
              <div className="checkout-section">
                <label>Discount (LKR)</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  style={{ marginTop: '6px' }}
                />
              </div>

              {/* Payment Method */}
              <div className="checkout-section">
                <label>Payment Method</label>
                <div className="payment-methods">
                  {(['cash', 'card', 'transfer'] as const).map((m) => (
                    <button
                      key={m}
                      className={`payment-method ${paymentMethod === m ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(m)}
                    >
                      {m === 'cash' ? '💵 Cash' : m === 'card' ? '💳 Card' : '🏦 Transfer'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="cart-summary">
                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <span>{formatLKR(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="cart-summary-row">
                    <span>Discount</span>
                    <span style={{ color: 'var(--danger)' }}>-{formatLKR(discountAmount)}</span>
                  </div>
                )}
                <div className="cart-summary-row total">
                  <span>Total</span>
                  <span>{formatLKR(total)}</span>
                </div>
                <div className="cart-summary-row" style={{ marginTop: '4px' }}>
                  <span>Profit</span>
                  <span style={{ color: profit >= 0 ? 'var(--emerald-400)' : 'var(--danger)' }}>
                    {formatLKR(profit)}
                  </span>
                </div>
              </div>

              <div className="cart-actions">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleCheckout}
                  disabled={processing}
                  style={{ width: '100%' }}
                >
                  {processing ? 'Processing...' : `💳 Complete Sale — ${formatLKR(total)}`}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCart([])}
                  style={{ width: '100%' }}
                >
                  Clear Cart
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
