import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function Order({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState({}); // { [orderId]: boolean }
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const endpoint =
          user === "Seller"
            ? "/orders/fetchOrdersBySeller"
            : "/orders/fetchOrderbyUserId";

        const response = await axiosInstance.get(endpoint);
        const data = response.data;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.orders)
          ? data.orders
          : Array.isArray(data.result)
          ? data.result
          : [];
        setOrders(list);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load orders"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const formatCurrency = (n) =>
    typeof n === "number" ? `₹${n.toFixed(2)}` : n || "₹0.00";

  const updateOrderInState = (orderId, patch) => {
    setOrders((prev) =>
      prev.map((o) => ((o._id || o.id) === orderId ? { ...o, ...patch } : o))
    );
  };

  const handleUpdateStatus = async (orderId, status, stopNav) => {
    const id = orderId;
    setActionLoading((s) => ({ ...s, [id]: true }));
    try {
      await axiosInstance.put(`/orders/cancelOrder/${id}`, { status });
      updateOrderInState(id, {
        status,
        paymentStatus: status === "confirmed" ? "completed" : undefined,
      });
    } catch (err) {
      console.error("Order status update error:", err);
      alert(err?.response?.data?.message || "Failed to update order status");
    } finally {
      setActionLoading((s) => ({ ...s, [id]: false }));
    }
  };

  if (loading)
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <span className="ml-3 text-gray-600">Loading orders...</span>
      </div>
    );
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!orders || orders.length === 0)
    return (
      <div className="p-6 text-center text-gray-600">No orders found.</div>
    );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between bg-white rounded-lg shadow-sm px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {user === "Seller" ? "Seller Orders" : "Orders"}
          </h2>
          <p className="text-sm text-gray-500">{orders.length} total</p>
        </div>
      </header>

      <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
        <button
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-800 hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-200"
          title="Show delivered orders"
        >
          Delivered
        </button>

        <button
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-50 text-yellow-800 hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-200"
          title="Show pending orders"
        >
          Pending
        </button>

        <button
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-800 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
          title="Show cancelled orders"
        >
          Cancelled
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => {
          const id = order._id || order.id;
          const date = order.orderDate || order.createdAt || order.updatedAt;
          const items = Array.isArray(order.Items)
            ? order.Items
            : order.items || [];
          const total =
            order.totalPrice ??
            order.totalAmount ??
            items.reduce((s, it) => {
              const price =
                it.finalPrice ??
                it.price ??
                (it.BookId && it.BookId.price) ??
                0;
              const qty = Number(it.quantity ?? 1);
              return s + price * qty;
            }, 0);

          const isSeller = user === "Seller";
          // showActions now only shows 'Decline' for sellers
          const showActions = isSeller && order.status === "pending";

          const resolvedStatus = (order.status || order.paymentStatus || "")
            .toString()
            .toLowerCase();
          let badgeClass = "bg-yellow-100 text-yellow-800";
          if (
            resolvedStatus === "completed" ||
            resolvedStatus === "confirmed"
          ) {
            badgeClass = "bg-green-100 text-green-800";
          } else if (
            resolvedStatus === "cancelled" ||
            resolvedStatus === "failed"
          ) {
            badgeClass = "bg-red-100 text-red-800";
          }
          const badgeText = order.status
            ? order.status.toUpperCase()
            : order.paymentStatus
            ? order.paymentStatus.toUpperCase()
            : "";

          return (
            <article
              key={id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-150 overflow-hidden cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/orders/${id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(`/orders/${id}`);
              }}
            >
              <div className="px-5 py-4 flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500">Order</div>
                  <div className="mt-1 text-sm font-medium text-gray-900 break-words">
                    {id}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {date ? new Date(date).toLocaleString() : ""}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${badgeClass}`}
                  >
                    {badgeText}
                  </span>

                  <div className="mt-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(total)}
                  </div>
                </div>
              </div>

              <div className="border-t px-5 py-3">
                <ul className="space-y-3">
                  {items.map((it, idx) => {
                    const book = it.BookId || it.book || {};
                    const title =
                      book.title || book.name || it.title || "Untitled";
                    const qty = it.quantity ?? 1;
                    const price = it.finalPrice ?? it.price ?? book.price ?? 0;
                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-xs overflow-hidden">
                            <span className="px-1">
                              {title.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm text-gray-800 font-medium truncate max-w-[12rem]">
                              {title}
                            </div>
                            <div className="text-xs text-gray-500">
                              Qty: {qty} • {formatCurrency(price)}
                            </div>
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-gray-800">
                          {formatCurrency(price * qty)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="px-5 py-3 bg-gray-50 flex items-center justify-between text-sm text-gray-600">
                <div>
                  Buyer:{" "}
                  <span className="font-medium text-gray-800">
                    {(order.userId &&
                      (order.userId.name || order.userId.email)) ||
                      order.buyerName ||
                      "-"}
                  </span>
                </div>

                {showActions ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(id, "cancelled", true);
                      }}
                      disabled={actionLoading[id]}
                      className="px-3 py-1 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
                      title="Decline order"
                    >
                      {actionLoading[id] ? "..." : "Decline"}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    {order.status ? order.status.toUpperCase() : ""}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default Order;
