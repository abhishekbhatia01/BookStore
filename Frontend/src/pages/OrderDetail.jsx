import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get(`/orders/fetchOrderbyorderId/${id}`);
      setOrder(res.data.order ?? res.data);
    } catch (err) {
      console.error("Error fetching order:", err);
      setError(err?.response?.data?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const formatCurrency = (n) =>
    typeof n === "number" ? `₹${n.toFixed(2)}` : n || "₹0.00";

  const handleUpdateStatus = async (status) => {
    setActionLoading(true);
    try {
      await axiosInstance.post(`/orders/cancelOrder/${id}`, { status });
      await fetchOrder();
    } catch (err) {
      console.error("Update status error:", err);
      alert(err?.response?.data?.message || "Failed to update order");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!order) return <div className="p-6">Order not found</div>;

  const items = Array.isArray(order.Items) ? order.Items : order.items || [];
  const total =
    order.totalPrice ??
    items.reduce((s, it) => {
      const price =
        it.finalPrice ?? it.price ?? (it.BookId && it.BookId.price) ?? 0;
      return s + price * (it.quantity ?? 1);
    }, 0);

  const resolvedStatus = (order.status || order.paymentStatus || "").toString().toLowerCase();
  let badgeClass = "bg-yellow-100 text-yellow-800";
  if (resolvedStatus === "confirmed" || resolvedStatus === "completed") {
    badgeClass = "bg-green-100 text-green-800";
  } else if (resolvedStatus === "cancelled" || resolvedStatus === "failed") {
    badgeClass = "bg-red-100 text-red-800";
  }
  const badgeText = (order.status || order.paymentStatus || "").toString().toUpperCase();

  return (
    <div className="max-w-4xl mx-auto mt-20 p-6 space-y-6 text-base">
      <div className="flex items-center justify-between">
        <button
          className="text-sm text-gray-600 hover:underline"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <div className="text-sm text-gray-500">
          Order ID: <span className="font-mono text-xs">{id}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Order Details</h3>
            <p className="text-base text-gray-500 mt-1">
              {order.orderDate ? new Date(order.orderDate).toLocaleString() : ""}
            </p>
          </div>

          <div className="text-right">
            <div className="text-lg font-semibold">{formatCurrency(total)}</div>
            <div className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full ${badgeClass}`}>
              {badgeText || "UNKNOWN"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-base font-medium text-gray-700">Shipping Address</h4>
            <div className="text-base text-gray-800 mt-2">
              <div>{order.shippingAddress?.fullName}</div>
              <div>{order.shippingAddress?.street}</div>
              <div>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} -{" "}
                {order.shippingAddress?.zipCode}
              </div>
              <div>{order.shippingAddress?.country}</div>
              <div className="text-sm text-gray-500 mt-1">
                {order.shippingAddress?.phone}{" "}
                {order.shippingAddress?.email && `• ${order.shippingAddress.email}`}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-base font-medium text-gray-700">Payment</h4>
            <div className="text-base text-gray-800 mt-2">
              <div>
                <span className="text-black font-semibold">Method:</span>{" "}
                {order.paymentMethod === "cash_on_delivery"
                  ? "Cash On Delivery"
                  : order.paymentMethod === "razorpay"
                  ? "Pre Paid"
                  : order.paymentMethod}
              </div>
              <div>
                <span className="text-black font-semibold">Payment Status:</span>{" "}
                {order.paymentStatus === "pending" ? "Pending" : order.paymentStatus || order.status}
              </div>
              {order.paymentDetails && (
                <pre className="text-sm text-gray-500 mt-3 p-3 bg-gray-50 rounded">
                  {JSON.stringify(order.paymentDetails, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-base font-medium text-gray-700">Items</h4>
          <ul className="mt-3 space-y-3">
            {items.map((it, idx) => {
              const book = it.BookId || it.book || {};
              const title = book.title || book.name || it.title || "Untitled";
              const qty = it.quantity ?? 1;
              const price = it.finalPrice ?? it.price ?? book.price ?? 0;
              return (
                <li key={idx} className="flex justify-between items-center">
                  <div>
                    <div className="text-base font-medium text-gray-800">{title}</div>
                    <div className="text-sm text-gray-500">Qty: {qty} • {formatCurrency(price)}</div>
                  </div>
                  <div className="text-base font-semibold">{formatCurrency(price * qty)}</div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-base text-gray-600">
            Buyer:{" "}
            <span className="font-medium text-gray-800">
              {order.userId?.name || order.userId?.email || "-"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {order.status !== "cancelled" && (
              <>
                <button
                  onClick={() => handleUpdateStatus("confirmed")}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-md bg-green-600 text-white text-base hover:bg-green-700 disabled:opacity-60"
                >
                  {actionLoading ? "..." : "Accept"}
                </button>
                <button
                  onClick={() => handleUpdateStatus("cancelled")}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-md bg-red-600 text-white text-base hover:bg-red-700 disabled:opacity-60"
                >
                  {actionLoading ? "..." : "Decline"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}