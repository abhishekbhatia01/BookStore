import React, { useEffect, useState } from "react";
import API from "../api/axiosInstance";

const CheckoutPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🏠 Fetch saved addresses
  const fetchAddresses = async () => {
    try {
      const res = await API.get("address/showAddress");
      if (Array.isArray(res.data)) setAddresses(res.data);
      else if (Array.isArray(res.data.addresses)) setAddresses(res.data.addresses);
      else if (res.data && (res.data._id || res.data.street)) setAddresses([res.data]);
      else setAddresses([]);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      setAddresses([]);
    }
  };

  // 🛒 Fetch cart
  const fetchCartItems = async () => {
    try {
      const res = await API.get("cart/showInCart");
      if (Array.isArray(res.data.items)) setCartItems(res.data.items);
      else if (Array.isArray(res.data.Items)) setCartItems(res.data.Items);
      else setCartItems([]);
    } catch (error) {
      console.error("Error fetching cart:", error);
      setCartItems([]);
    }
  };

  useEffect(() => {
    fetchAddresses();
    fetchCartItems();
  }, []);

  // ✅ Load Razorpay SDK dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 💳 Handle Razorpay payment popup
  const handleRazorpayPayment = async (orderData, addressId) => {
    const res = await loadRazorpayScript();
    if (!res) {
      alert("Failed to load Razorpay SDK. Check your internet connection.");
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Book Store",
      description: "Order Payment",
      order_id: orderData.razorpayOrderId,
      handler: async function (response) {
        try {
          // Verify payment on backend
          const verifyRes = await API.post("cart/verify-payment", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            addressId,
          });

          setMessage("✅ Payment successful! Order placed.");
          setCartItems([]);
          console.log("Verified order:", verifyRes.data.order);
        } catch (err) {
          console.error("Payment verification error:", err);
          setMessage("❌ Payment verification failed. Please contact support.");
        }
      },
      theme: { color: "#2563eb" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // 🧾 Handle checkout
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!selectedAddress) return alert("Please select an address!");
    const addrObj = addresses.find((a) => a._id === selectedAddress);
    if (!addrObj) return alert("Selected address not found.");

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        addressId: selectedAddress,
        paymentMethod,
      };

      // 1️⃣ Create Razorpay order or COD order
      const res = await API.post("cart/checkout", payload);

      // 2️⃣ Razorpay flow
      if (paymentMethod === "razorpay" && res.data.razorpayOrderId) {
        await handleRazorpayPayment(res.data, selectedAddress);
      } else {
        // 3️⃣ COD flow
        setMessage("✅ Order placed successfully (Cash on Delivery)!");
        setCartItems([]);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      const errMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Checkout failed. Try again.";
      setMessage(`❌ ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // 🧱 UI
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Checkout</h1>

      {/* ADDRESS SECTION */}
      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Select Shipping Address</h2>
        {addresses.length === 0 ? (
          <p>No addresses found.</p>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr._id}
              className="flex items-center border-b py-2 cursor-pointer"
              onClick={() => setSelectedAddress(addr._id)}
            >
              <input
                type="radio"
                name="selectedAddress"
                checked={selectedAddress === addr._id}
                onChange={() => setSelectedAddress(addr._id)}
                className="mr-3 accent-blue-600"
              />
              <label>
                <span className="font-medium">{addr.street}</span>, {addr.city},{" "}
                {addr.state} - {addr.zip || addr.zipCode}
              </label>
            </div>
          ))
        )}
      </div>

      {/* CART SECTION */}
      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Your Cart</h2>
        {cartItems.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul>
            {cartItems.map((item, i) => (
              <li key={i} className="mb-2">
                {item.BookId?.title} × {item.quantity}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PAYMENT SECTION */}
      <div className="border rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Payment Method</h2>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="border p-2 rounded-md w-full"
        >
          <option value="cash_on_delivery">Cash on Delivery</option>
          <option value="razorpay">Razorpay</option>
        </select>
      </div>

      {/* BUTTON */}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="bg-blue-600 text-white w-full py-3 rounded-md font-semibold hover:bg-blue-700 transition"
      >
        {loading ? "Processing..." : "Place Order"}
      </button>

      {/* MESSAGE */}
      {message && (
        <p
          className={`text-center mt-4 font-medium ${
            message.includes("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default CheckoutPage;
